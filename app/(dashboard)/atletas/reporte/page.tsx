import { getAthletes, getAllMovimientos } from "@/lib/queries/atletas";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

export default async function ReporteSaldosPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const atletas = await getAthletes();

    // Diagnóstico: cuántos atletas tienen acuerdo 2026 con pase o prima > 0
    const conAcuerdo = atletas.filter(a => a.acuerdo_2026 !== null);
    const conPactado = atletas.filter(a =>
        (Number(a.acuerdo_2026?.costo_pase) || 0) + (Number(a.acuerdo_2026?.prima_inicial) || 0) > 0
    );
    console.log(`[reporte/saldos] Total atletas: ${atletas.length} | Con acuerdo_2026: ${conAcuerdo.length} | Con pactado > 0: ${conPactado.length}`);
    conPactado.forEach(a => {
        console.log(`  → ${a.nombre_completo} | pase: ${a.acuerdo_2026?.costo_pase} | prima: ${a.acuerdo_2026?.prima_inicial}`);
    });

    let movimientos: any[] = [];
    if (user) {
        const { data: perfil } = await supabase
            .from("perfiles")
            .select("organization_id")
            .eq("id", user.id)
            .single();
        if (perfil?.organization_id) {
            movimientos = await getAllMovimientos(perfil.organization_id);
        }
    }

    // Index movements by atleta_id
    const movsByAtleta = new Map<string, any[]>();
    movimientos.forEach(m => {
        if (!movsByAtleta.has(m.atleta_id)) movsByAtleta.set(m.atleta_id, []);
        movsByAtleta.get(m.atleta_id)!.push(m);
    });

    // Group by category
    const agrupados = atletas.reduce((acc, a) => {
        const cat = a.categorias?.nombre || "Sin Categoría";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(a);
        return acc;
    }, {} as Record<string, typeof atletas>);

    const ORDER = ["Primera", "Sub-20", "Sub-19", "Sub-16", "Sub-14"];
    const keys = Object.keys(agrupados).sort((a, b) => {
        const iA = ORDER.indexOf(a), iB = ORDER.indexOf(b);
        if (iA !== -1 && iB !== -1) return iA - iB;
        if (iA !== -1) return -1;
        if (iB !== -1) return 1;
        return a.localeCompare(b);
    });

    const fmt = (n: number) => {
        if (!n || n === 0) return "-";
        return new Intl.NumberFormat("es-PY").format(n);
    };

    function getSaldo(atletaId: string) {
        const movs = movsByAtleta.get(atletaId) || [];
        const totalHaber = movs
            .filter(m => m.tipo === "HABER")
            .reduce((s: number, m: any) => s + Number(m.monto), 0);
        const totalPagado = movs
            .filter(m => m.tipo === "DEBE" && (
                m.concepto?.toLowerCase().includes('pase') ||
                m.concepto?.toLowerCase().includes('prima')
            ))
            .reduce((s: number, m: any) => s + Number(m.monto), 0);
        return { totalHaber, totalPagado, saldo: totalHaber - totalPagado };
    }

    // Grand totals
    let gHaber = 0, gPagado = 0, gSaldo = 0;

    return (
        <div className="flex-1 p-8 pt-6 print:p-0">
            <div className="print:hidden flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Reporte de Saldos Pendientes</h2>
                    <p className="text-muted-foreground">Cuenta corriente por atleta, agrupada por categoría.</p>
                </div>
                <PrintButton />
            </div>

            <div id="reporte-impresion" className="print:bg-white print:text-black">
                <div className="hidden print:block mb-6 text-center">
                    <h1 className="text-2xl font-bold uppercase">Club Deportivo</h1>
                    <h2 className="text-lg border-b-2 border-black inline-block px-4 pb-1">
                        Reporte de Saldos Pendientes
                    </h2>
                </div>

                <div className="space-y-10 print:space-y-6">
                    {keys.length === 0 && (
                        <p className="text-center text-muted-foreground mt-10">No hay atletas registrados.</p>
                    )}

                    {keys.map(cat => {
                        let sHaber = 0, sPagado = 0, sSaldo = 0;

                        const rows = agrupados[cat].map(a => {
                            const s = getSaldo(a.id);
                            sHaber += s.totalHaber;
                            sPagado += s.totalPagado;
                            sSaldo += s.saldo;
                            return { a, s };
                        });

                        gHaber += sHaber; gPagado += sPagado; gSaldo += sSaldo;

                        return (
                            <div key={cat} className="print:break-inside-avoid">
                                <h3 className="text-xl font-bold mb-3 uppercase border-b border-gray-600 print:border-gray-300 pb-2">
                                    Categoría: {cat}{" "}
                                    <span className="text-sm font-normal text-gray-500">
                                        ({agrupados[cat].length} jugadores)
                                    </span>
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left border-collapse bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800">
                                        <thead>
                                            <tr className="border-b border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">
                                                <th className="py-2 px-2 font-semibold">Atleta</th>
                                                <th className="py-2 px-2 font-semibold">C.I.</th>
                                                <th className="py-2 px-2 text-right font-semibold bg-blue-50 dark:bg-blue-950/30 print:bg-transparent">Total Haber</th>
                                                <th className="py-2 px-2 text-right font-semibold bg-emerald-50 dark:bg-emerald-950/30 print:bg-transparent">Total Pagado</th>
                                                <th className="py-2 px-2 text-right font-semibold bg-amber-50 dark:bg-amber-950/30 print:bg-transparent">Saldo</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.map(({ a, s }) => {
                                                const saldoColor = s.saldo > 0
                                                    ? "text-red-600 font-bold"
                                                    : "text-emerald-600";
                                                return (
                                                    <tr
                                                        key={a.id}
                                                        className="border-b border-zinc-100 dark:border-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                                                    >
                                                        <td className="py-1.5 px-2 font-medium">{a.nombre_completo}</td>
                                                        <td className="py-1.5 px-2 font-mono">{a.documento || "-"}</td>
                                                        <td className="py-1.5 px-2 text-right font-semibold text-blue-600">{fmt(s.totalHaber)}</td>
                                                        <td className="py-1.5 px-2 text-right font-semibold text-emerald-600">{fmt(s.totalPagado)}</td>
                                                        <td className={`py-1.5 px-2 text-right ${saldoColor}`}>{fmt(s.saldo)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot className="bg-zinc-100 dark:bg-zinc-900 font-bold">
                                            <tr>
                                                <td colSpan={2} className="py-2 px-2 uppercase">Subtotal {cat}</td>
                                                <td className="py-2 px-2 text-right text-blue-700">{fmt(sHaber)}</td>
                                                <td className="py-2 px-2 text-right text-emerald-700">{fmt(sPagado)}</td>
                                                <td className={`py-2 px-2 text-right ${sSaldo > 0 ? "text-red-700" : "text-emerald-700"}`}>
                                                    {fmt(sSaldo)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        );
                    })}

                    {keys.length > 0 && (
                        <div className="print:break-inside-avoid">
                            <table className="w-full text-xs border-collapse bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 print:bg-gray-800 print:text-white font-bold">
                                <tbody>
                                    <tr>
                                        <td colSpan={2} className="py-3 px-2 uppercase text-sm">Total General</td>
                                        <td className="py-3 px-2 text-right">{fmt(gHaber)}</td>
                                        <td className="py-3 px-2 text-right text-emerald-300">{fmt(gPagado)}</td>
                                        <td className={`py-3 px-2 text-right ${gSaldo > 0 ? "text-red-300" : gSaldo === 0 ? "text-emerald-300" : "text-blue-300"}`}>
                                            {fmt(gSaldo)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { size: A4 landscape; margin: 8mm; }
                    body, html { background: white !important; color: black !important; }
                    body * { visibility: hidden; }
                    #reporte-impresion, #reporte-impresion * { visibility: visible; }
                    #reporte-impresion { position: absolute; left: 0; top: 0; width: 100%; margin: 0; }
                    table, tr, td, th, thead, tbody { background-color: white !important; color: black !important; border-color: #ccc !important; }
                    tfoot tr, tfoot td { background-color: #e5e7eb !important; }
                }
            `}} />
        </div>
    );
}
