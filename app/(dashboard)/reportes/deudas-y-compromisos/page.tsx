import { getAthletes, getAllMovimientos } from "@/lib/queries/atletas";
import { getPendingExpenses, getSaldoPrestamos } from "@/lib/queries/transactions";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/app/(dashboard)/atletas/reporte/PrintButton"; 
import { differenceInDays, parseISO, startOfDay } from "date-fns";

export const dynamic = "force-dynamic";

export default async function DeudasYCompromisosPage() {
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

    // 2. Obtener Préstamos y Financieros (usando la función)
    // Devuelve: id, nombre, total_recibido, total_devuelto, saldo_neto
    const prestamosYFinancieros = organizationId ? await getSaldoPrestamos(organizationId) : [];

    // 3. Obtener Saldos con Atletas
    const atletas = await getAthletes();
    let movimientos: any[] = [];
    if (organizationId) {
        movimientos = await getAllMovimientos(organizationId);
    }

    // Index movements by atleta_id
    const movsByAtleta = new Map<string, any[]>();
    movimientos.forEach(m => {
        if (!movsByAtleta.has(m.atleta_id)) movsByAtleta.set(m.atleta_id, []);
        movsByAtleta.get(m.atleta_id)!.push(m);
    });

    const agrupadosAtletas = atletas.reduce((acc, a) => {
        const cat = a.categorias?.nombre || "Sin Categoría";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(a);
        return acc;
    }, {} as Record<string, typeof atletas>);

    const ORDER = ["Primera", "Sub-20", "Sub-19", "Sub-16", "Sub-14"];
    const keysAtletas = Object.keys(agrupadosAtletas).sort((a, b) => {
        const iA = ORDER.indexOf(a), iB = ORDER.indexOf(b);
        if (iA !== -1 && iB !== -1) return iA - iB;
        if (iA !== -1) return -1;
        if (iB !== -1) return 1;
        return a.localeCompare(b);
    });

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

    // 4. Cálculos de Resumen General
    const totalCuentasAPagar = cuentasAPagar.reduce((acc, curr) => acc + Number(curr.monto), 0);
    
    // Filtrar los saldos netos positivos o cero
    const totalPrestamos = prestamosYFinancieros
        .filter(p => p.saldo_neto > 0)
        .reduce((acc, curr) => acc + Number(curr.saldo_neto), 0);
    
    let totalAtletas = 0;
    atletas.forEach(a => {
        const { saldo } = getSaldoAtleta(a.id);
        if (saldo > 0) totalAtletas += saldo;
    });

    const totalDeudaClub = totalCuentasAPagar + totalPrestamos + totalAtletas;

    const getExpirationStatus = (fecha_vencimiento: string | null) => {
        if (!fecha_vencimiento) return { text: "Sin fecha", color: "text-muted-foreground" };
        const hoy = startOfDay(new Date());
        const vencimiento = startOfDay(parseISO(fecha_vencimiento));
        const diff = differenceInDays(vencimiento, hoy);

        if (diff < 0) return { text: `Vencida hace ${Math.abs(diff)} días`, color: "text-red-600 font-semibold" };
        if (diff <= 7) return { text: diff === 0 ? "Vence hoy" : `Vence en ${diff} días`, color: "text-yellow-600 font-semibold" };
        
        const [y, m, d] = fecha_vencimiento.split('T')[0].split('-');
        return { text: `${d}/${m}/${y}`, color: "" };
    };

    return (
        <div className="flex-1 p-8 pt-6 print:p-0">
            <div className="print:hidden flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Deudas y Compromisos del Club</h2>
                    <p className="text-muted-foreground">Reporte unificado de cuentas a pagar, préstamos y saldos con atletas.</p>
                </div>
                <PrintButton />
            </div>

            <div id="reporte-impresion" className="print:bg-white print:text-black">
                
                <div className="hidden print:block mb-6 text-center">
                    <h1 className="text-2xl font-bold uppercase">Club Deportivo</h1>
                    <h2 className="text-lg border-b-2 border-black inline-block px-4 pb-1">
                        Deudas y Compromisos del Club
                    </h2>
                </div>

                {/* 1. RESUMEN GENERAL */}
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

                {/* 2. SECCIÓN: Cuentas a Pagar */}
                <div className="mb-10 print:mb-6 print:break-inside-avoid">
                    <h3 className="text-xl font-semibold mb-4 print:text-lg border-b pb-2">1. Cuentas a Pagar</h3>
                    {cuentasAPagar.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No hay cuentas a pagar registradas.</p>
                    ) : (
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="border-b bg-muted/50 print:bg-transparent">
                                    <th className="py-2 px-2 text-left font-medium">Vencimiento</th>
                                    <th className="py-2 px-2 text-left font-medium">Entidad</th>
                                    <th className="py-2 px-2 text-left font-medium">Descripción</th>
                                    <th className="py-2 px-2 text-right font-medium">Monto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cuentasAPagar.map((gasto, i) => {
                                    const status = getExpirationStatus(gasto.fecha_vencimiento);
                                    const entidadNombre = Array.isArray(gasto.entidades) 
                                        ? gasto.entidades[0]?.nombre 
                                        : (gasto.entidades as any)?.nombre;
                                    return (
                                        <tr key={i} className="border-b print:border-gray-300">
                                            <td className={`py-2 px-2 ${status.color}`}>{status.text}</td>
                                            <td className="py-2 px-2">{entidadNombre || "-"}</td>
                                            <td className="py-2 px-2">{gasto.descripcion || "-"}</td>
                                            <td className="py-2 px-2 text-right font-medium">Gs. {fmt(gasto.monto)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* 3. SECCIÓN: Préstamos y Financieros */}
                <div className="mb-10 print:mb-6 print:break-inside-avoid">
                    <h3 className="text-xl font-semibold mb-4 print:text-lg border-b pb-2">2. Préstamos y Financieros</h3>
                    {prestamosYFinancieros.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No hay préstamos o deudas financieras registradas.</p>
                    ) : (
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="border-b bg-muted/50 print:bg-transparent">
                                    <th className="py-2 px-2 text-left font-medium">Entidad</th>
                                    <th className="py-2 px-2 text-right font-medium">Total Recibido</th>
                                    <th className="py-2 px-2 text-right font-medium">Total Devuelto</th>
                                    <th className="py-2 px-2 text-right font-medium">Saldo Pendiente</th>
                                </tr>
                            </thead>
                            <tbody>
                                {prestamosYFinancieros.map((prestamo, i) => {
                                    if (prestamo.saldo_neto <= 0) return null;
                                    return (
                                        <tr key={i} className="border-b print:border-gray-300">
                                            <td className="py-2 px-2">{prestamo.nombre || "-"}</td>
                                            <td className="py-2 px-2 text-right">Gs. {fmt(prestamo.total_recibido)}</td>
                                            <td className="py-2 px-2 text-right">Gs. {fmt(prestamo.total_devuelto)}</td>
                                            <td className="py-2 px-2 text-right font-bold">Gs. {fmt(prestamo.saldo_neto)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* 4. SECCIÓN: Saldos con Atletas */}
                <div className="print:break-inside-avoid">
                    <h3 className="text-xl font-semibold mb-4 print:text-lg border-b pb-2">3. Saldos con Atletas</h3>
                    
                    {keysAtletas.map(cat => {
                        const lista = agrupadosAtletas[cat];
                        const items = lista
                            .map(a => {
                                const { totalPactado, totalPagado, saldo } = getSaldoAtleta(a.id);
                                return { ...a, totalPactado, totalPagado, saldo };
                            })
                            .filter(a => a.saldo > 0)
                            .sort((a, b) => b.saldo - a.saldo);

                        if (items.length === 0) return null;

                        const catTotal = items.reduce((s, a) => s + a.saldo, 0);

                        return (
                            <div key={cat} className="mb-6 print:mb-4">
                                <h4 className="text-lg font-semibold mb-3 print:text-base print:mb-2 text-primary">{cat}</h4>
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="border-b bg-muted/50 print:bg-transparent">
                                            <th className="py-2 px-2 text-left font-medium">Jugador</th>
                                            <th className="py-2 px-2 text-right font-medium">Total Pactado</th>
                                            <th className="py-2 px-2 text-right font-medium">Pagado a la fecha</th>
                                            <th className="py-2 px-2 text-right font-medium">Saldo Pendiente</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((a, i) => (
                                            <tr key={i} className="border-b print:border-gray-300">
                                                <td className="py-2 px-2">
                                                    <div className="font-medium">{a.nombre_completo}</div>
                                                    <div className="text-xs text-muted-foreground">CI: {a.documento}</div>
                                                </td>
                                                <td className="py-2 px-2 text-right">Gs. {fmt(a.totalPactado)}</td>
                                                <td className="py-2 px-2 text-right">Gs. {fmt(a.totalPagado)}</td>
                                                <td className="py-2 px-2 text-right font-bold">Gs. {fmt(a.saldo)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-muted/30 font-semibold print:bg-gray-100">
                                            <td className="py-2 px-2" colSpan={3}>Subtotal {cat}</td>
                                            <td className="py-2 px-2 text-right">Gs. {fmt(catTotal)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        );
                    })}
                </div>

            </div>
        </div>
    );
}
