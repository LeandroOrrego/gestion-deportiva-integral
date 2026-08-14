import { getAthletes, getAllMovimientos } from "@/lib/queries/atletas";
import { getPendingExpenses, getSaldoPrestamos } from "@/lib/queries/transactions";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/app/(dashboard)/atletas/reporte/PrintButton"; 
import { differenceInDays, parseISO, startOfDay } from "date-fns";
import { DeudasFilter } from "./DeudasFilter";

export const dynamic = "force-dynamic";

type UnifiedDebt = {
    entidadId: string;
    entidad: string;
    categoria: string;
    descripcion: string;
    valor: number;
    estado: string;
    color: string;
    sortPriority: number;
};

export default async function DeudasYCompromisosPage({ 
    searchParams 
}: { 
    searchParams: Promise<{ [key: string]: string | string[] | undefined }> 
}) {
    const params = await searchParams;
    const entidadIdFilter = typeof params.entidad_id === 'string' ? params.entidad_id : 'all';

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let organizationId = "";
    if (user) {
        const { data: perfil } = await supabase
            .from("perfiles")
            .select("organization_id")
            .eq("id", user.id)
            .single();
        if (perfil?.organization_id) {
            organizationId = perfil.organization_id;
        }
    }

    // 1. Obtener Cuentas a Pagar (Gastos Pendientes)
    const cuentasAPagar = organizationId ? await getPendingExpenses(organizationId) : [];

    // 2. Obtener Préstamos y Financieros
    const prestamosYFinancieros = organizationId ? await getSaldoPrestamos(organizationId) : [];

    // 3. Obtener Saldos con Atletas
    const atletas = await getAthletes();
    let movimientos: any[] = [];
    if (organizationId) {
        movimientos = await getAllMovimientos(organizationId);
    }

    const movsByAtleta = new Map<string, any[]>();
    movimientos.forEach(m => {
        if (!movsByAtleta.has(m.atleta_id)) movsByAtleta.set(m.atleta_id, []);
        movsByAtleta.get(m.atleta_id)!.push(m);
    });

    const { data: entidadesData } = await supabase
        .from('entidades')
        .select('id, nombre')
        .eq('organization_id', organizationId)
        .order('nombre');

    const filterOptions = [
        ...(entidadesData || []),
        ...atletas.map(a => ({ id: a.id, nombre: a.nombre_completo }))
    ].sort((a, b) => a.nombre.localeCompare(b.nombre));

    const CONCEPTOS_PACTADO = ['Pase', 'Prima'];

    function getSaldoAtleta(atletaId: string) {
        const movs = movsByAtleta.get(atletaId) || [];
        const totalPactado = movs
            .filter(m => m.tipo === "HABER" && CONCEPTOS_PACTADO.includes(m.concepto))
            .reduce((s: number, m: any) => s + Number(m.monto), 0);
        const totalPagado = movs
            .filter(m => m.tipo === "DEBE" && (
                m.concepto?.toLowerCase().includes('pase') ||
                m.concepto?.toLowerCase().includes('prima')
            ))
            .reduce((s: number, m: any) => s + Number(m.monto), 0);
        return { totalPactado, totalPagado, saldo: totalPactado - totalPagado };
    }

    const fmt = (n: number) => {
        if (!n || n === 0) return "-";
        return new Intl.NumberFormat("es-PY").format(n);
    };

    // Helper de fechas y estado
    const getExpirationStatus = (fecha_vencimiento: string | null) => {
        if (!fecha_vencimiento) return { text: "Sin fecha", color: "text-muted-foreground", priority: 3 };
        const hoy = startOfDay(new Date());
        const vencimiento = startOfDay(parseISO(fecha_vencimiento));
        const diff = differenceInDays(vencimiento, hoy);

        if (diff < 0) return { text: `Vencida hace ${Math.abs(diff)} días`, color: "text-red-600 font-semibold", priority: 1 };
        if (diff <= 7) return { text: diff === 0 ? "Vence hoy" : `Vence en ${diff} días`, color: "text-yellow-600 font-semibold", priority: 2 };
        
        const [y, m, d] = fecha_vencimiento.split('T')[0].split('-');
        return { text: `${d}/${m}/${y}`, color: "", priority: 3 };
    };

    // --- CONSTRUCCIÓN DEL ARRAY UNIFICADO ---
    const unifiedData: UnifiedDebt[] = [];

    let totalCuentasAPagar = 0;
    cuentasAPagar.forEach(gasto => {
        const monto = Number(gasto.monto);
        totalCuentasAPagar += monto;
        
        const status = getExpirationStatus(gasto.fecha_vencimiento);
        const entidadObj = Array.isArray(gasto.entidades) ? gasto.entidades[0] : gasto.entidades;

        unifiedData.push({
            entidadId: (entidadObj as any)?.id || "",
            entidad: (entidadObj as any)?.nombre || "-",
            categoria: "Cuenta a Pagar",
            descripcion: gasto.descripcion || "-",
            valor: monto,
            estado: status.text,
            color: status.color,
            sortPriority: status.priority
        });
    });

    let totalPrestamos = 0;
    prestamosYFinancieros.forEach(prestamo => {
        const saldoNeto = Number(prestamo.saldo_neto);
        if (saldoNeto > 0) {
            unifiedData.push({
                entidadId: prestamo.id || "",
                entidad: prestamo.nombre || "-",
                categoria: "Préstamo Financiero",
                descripcion: "Saldo pendiente de devolución",
                valor: saldoNeto,
                estado: "Sin vencimiento",
                color: "text-muted-foreground",
                sortPriority: 3
            });
        }
    });

    let totalAtletas = 0;
    atletas.forEach(a => {
        const { saldo } = getSaldoAtleta(a.id);
        if (saldo > 0) {
            unifiedData.push({
                entidadId: a.id,
                entidad: a.nombre_completo,
                categoria: "Prima/Pase Atleta",
                descripcion: "Prima/Pase pendiente",
                valor: saldo,
                estado: "Sin vencimiento",
                color: "text-muted-foreground",
                sortPriority: 3
            });
        }
    });

    const totalDeudaClub = totalCuentasAPagar + totalPrestamos + totalAtletas;

    // --- ORDENAMIENTO ---
    unifiedData.sort((a, b) => {
        // 1. Prioridad de estado (1: Vencida, 2: A Vencer, 3: Resto)
        if (a.sortPriority !== b.sortPriority) {
            return a.sortPriority - b.sortPriority;
        }
        // 2. Orden descendente por valor
        return b.valor - a.valor;
    });

    let filteredData = unifiedData;
    if (entidadIdFilter && entidadIdFilter !== 'all') {
        filteredData = unifiedData.filter(item => String(item.entidadId) === String(entidadIdFilter));
    }

    totalCuentasAPagar = filteredData.filter(d => d.categoria === "Cuenta a Pagar").reduce((acc, curr) => acc + curr.valor, 0);
    totalPrestamos = filteredData.filter(d => d.categoria === "Préstamo Financiero").reduce((acc, curr) => acc + curr.valor, 0);
    totalAtletas = filteredData.filter(d => d.categoria === "Prima/Pase Atleta").reduce((acc, curr) => acc + curr.valor, 0);
    const totalDeudaClub = totalCuentasAPagar + totalPrestamos + totalAtletas;

    return (
        <div className="flex-1 p-8 pt-6 print:p-0">
            <div className="print:hidden flex flex-col md:flex-row gap-4 md:items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Deudas y Compromisos del Club</h2>
                    <p className="text-muted-foreground">Reporte unificado de todas las obligaciones pendientes.</p>
                </div>
                <div className="flex items-center gap-4">
                    <DeudasFilter entities={filterOptions} />
                    <PrintButton />
                </div>
            </div>

            <div id="reporte-impresion" className="print:bg-white print:text-black">
                
                <div className="hidden print:block mb-6 text-center">
                    <h1 className="text-2xl font-bold uppercase">Club Deportivo</h1>
                    <h2 className="text-lg border-b-2 border-black inline-block px-4 pb-1">
                        Deudas y Compromisos del Club
                    </h2>
                </div>

                {/* RESUMEN GENERAL (Intacto) */}
                <div className="mb-10 print:mb-6">
                    <h3 className="text-xl font-semibold mb-4 print:text-lg border-b pb-2">Resumen General</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
                        <div className="bg-muted p-4 rounded-lg print:border print:bg-transparent">
                            <p className="text-sm text-muted-foreground print:text-black">Cuentas a Pagar</p>
                            <p className="text-2xl font-bold">Gs. {fmt(totalCuentasAPagar)}</p>
                        </div>
                        <div className="bg-muted p-4 rounded-lg print:border print:bg-transparent">
                            <p className="text-sm text-muted-foreground print:text-black">Préstamos y Financieros</p>
                            <p className="text-2xl font-bold">Gs. {fmt(totalPrestamos)}</p>
                        </div>
                        <div className="bg-muted p-4 rounded-lg print:border print:bg-transparent">
                            <p className="text-sm text-muted-foreground print:text-black">Saldos con Atletas</p>
                            <p className="text-2xl font-bold">Gs. {fmt(totalAtletas)}</p>
                        </div>
                        <div className="bg-primary/10 p-4 rounded-lg border border-primary/20 print:border-black print:bg-transparent">
                            <p className="text-sm font-semibold print:text-black">Total Deuda del Club</p>
                            <p className="text-2xl font-bold text-primary print:text-black">Gs. {fmt(totalDeudaClub)}</p>
                        </div>
                    </div>
                </div>

                {/* TABLA UNIFICADA DE DETALLES */}
                <div className="print:break-inside-avoid">
                    <h3 className="text-xl font-semibold mb-4 print:text-lg border-b pb-2">Detalle de Obligaciones</h3>
                    
                    {unifiedData.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No hay deudas ni compromisos pendientes.</p>
                    ) : (
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="border-b bg-muted/50 print:bg-transparent">
                                    <th className="py-2 px-2 text-left font-medium">Entidad</th>
                                    <th className="py-2 px-2 text-left font-medium">Categoría</th>
                                    <th className="py-2 px-2 text-left font-medium">Descripción</th>
                                    <th className="py-2 px-2 text-right font-medium">Valor</th>
                                    <th className="py-2 px-2 text-left font-medium">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((item, i) => (
                                    <tr key={i} className="border-b print:border-gray-300">
                                        <td className="py-2 px-2 font-medium">{item.entidad}</td>
                                        <td className="py-2 px-2 text-muted-foreground">{item.categoria}</td>
                                        <td className="py-2 px-2 text-muted-foreground">{item.descripcion}</td>
                                        <td className="py-2 px-2 text-right font-semibold">Gs. {fmt(item.valor)}</td>
                                        <td className={`py-2 px-2 ${item.color}`}>{item.estado}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

            </div>
        </div>
    );
}
