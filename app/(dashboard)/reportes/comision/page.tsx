import { getAthletes, getAllMovimientos } from "@/lib/queries/atletas";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

export default async function ReporteComisionPage({
    searchParams
}: {
    searchParams: Promise<{ cat?: string; cols?: string }> | { cat?: string; cols?: string };
}) {
    const atletas = await getAthletes();
    const sp = await searchParams;

    // Get org_id for bulk movements
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    let movimientos: any[] = [];
    if (user) {
        const { data: perfil } = await supabase.from("perfiles").select("organization_id").eq("id", user.id).single();
        if (perfil?.organization_id) movimientos = await getAllMovimientos(perfil.organization_id);
    }

    // Index movements by atleta_id
    const movsByAtleta = new Map<string, any[]>();
    movimientos.forEach(m => {
        if (!movsByAtleta.has(m.atleta_id)) movsByAtleta.set(m.atleta_id, []);
        movsByAtleta.get(m.atleta_id)!.push(m);
    });

    // Filter
    const catFilter = sp?.cat;
    const atletasFiltrados = atletas.filter(a => {
        if (!catFilter || catFilter.toLowerCase() === "todas") return true;
        return a.categorias?.nombre === catFilter || a.categorias?.id === catFilter;
    });

    // Group by category
    const agrupados = atletasFiltrados.reduce((acc, a) => {
        const cat = a.categorias?.nombre || "Sin Categoría";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(a);
        return acc;
    }, {} as Record<string, typeof atletasFiltrados>);

    const order = ["Primera", "Sub-20", "Sub-19", "Sub-16", "Sub-14"];
    const keys = Object.keys(agrupados).sort((a, b) => {
        const iA = order.indexOf(a), iB = order.indexOf(b);
        if (iA !== -1 && iB !== -1) return iA - iB;
        if (iA !== -1) return -1;
        if (iB !== -1) return 1;
        return a.localeCompare(b);
    });

    const fmt = (n: number | undefined | null) => {
        if (!n || n === 0) return "-";
        return new Intl.NumberFormat("es-PY").format(n);
    };

    // Compute per-athlete saldo data
    function getAtletaSaldo(atletaId: string, ac: any) {
        const movs = movsByAtleta.get(atletaId) || [];
        const pase = movs.filter(m => m.tipo === "HABER" && /pase/i.test(m.concepto || "")).reduce((s: number, m: any) => s + Number(m.monto), 0);
        const prima = movs.filter(m => m.tipo === "HABER" && /prima/i.test(m.concepto || "")).reduce((s: number, m: any) => s + Number(m.monto), 0);
        const totalPactado = pase + prima;
        const totalPagado = movs.filter(m => m.tipo === "DEBE").reduce((s: number, m: any) => s + Number(m.monto), 0);
        const saldo = totalPactado - totalPagado;
        return { pase, prima, totalPactado, totalPagado, saldo };
    }

    // Grand totals
    let gPase = 0, gPrima = 0, gVPract = 0, gPVict = 0, gPEmp = 0, gPDerr = 0, gPactado = 0, gPagado = 0, gSaldo = 0;

    return (
        <div className="flex-1 p-8 pt-6 print:p-0">
            <div className="print:hidden flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Reporte de Previsión Financiera</h2>
                    <p className="text-muted-foreground">Saldos pendientes por atleta, agrupados por categoría.</p>
                </div>
                <PrintButton />
            </div>

            <div id="reporte-impresion" className="print:bg-white print:text-black">
                <div className="hidden print:block mb-6 text-center">
                    <h1 className="text-2xl font-bold uppercase">Club Deportivo Naranjal</h1>
                    <h2 className="text-lg border-b-2 border-black inline-block px-4 pb-1">
                        Reporte de Previsión Financiera {catFilter && catFilter !== "todas" ? `- ${catFilter}` : ""}
                    </h2>
                </div>

                <div className="space-y-10 print:space-y-6">
                    {keys.length === 0 && (
                        <p className="text-center text-muted-foreground mt-10">No hay atletas registrados.</p>
                    )}

                    {keys.map(cat => {
                        let sPase = 0, sPrima = 0, sVPract = 0, sPVict = 0, sPEmp = 0, sPDerr = 0, sPactado = 0, sPagado = 0, sSaldo = 0;

                        const rows = agrupados[cat].map(a => {
                            const ac = a.acuerdo_2026;
                            const s = getAtletaSaldo(a.id, ac);
                            sPase += s.pase; sPrima += s.prima;
                            sVPract += Number(ac?.viatico_practica) || 0;
                            sPVict += Number(ac?.premio_victoria) || 0;
                            sPEmp += Number(ac?.premio_empate) || 0;
                            sPDerr += Number(ac?.premio_derrota) || 0;
                            sPactado += s.totalPactado; sPagado += s.totalPagado; sSaldo += s.saldo;
                            return { a, ac, s };
                        });

                        gPase += sPase; gPrima += sPrima; gVPract += sVPract;
                        gPVict += sPVict; gPEmp += sPEmp; gPDerr += sPDerr;
                        gPactado += sPactado; gPagado += sPagado; gSaldo += sSaldo;

                        return (
                            <div key={cat} className="print:break-inside-avoid">
                                <h3 className="text-xl font-bold mb-3 uppercase border-b border-gray-600 print:border-gray-300 pb-2">
                                    Categoría: {cat} <span className="text-sm font-normal text-gray-500">({agrupados[cat].length} jugadores)</span>
                                </h3>
                                <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left border-collapse bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800">
                                    <thead>
                                        <tr className="border-b border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">
                                            <th className="py-2 px-2 font-semibold">Atleta</th>
                                            <th className="py-2 px-2 font-semibold">C.I.</th>
                                            <th className="py-2 px-2 text-right font-semibold">Pase</th>
                                            <th className="py-2 px-2 text-right font-semibold">Prima</th>
                                            <th className="py-2 px-2 text-right font-semibold">V. Práctica</th>
                                            <th className="py-2 px-2 text-right font-semibold">P. Victoria</th>
                                            <th className="py-2 px-2 text-right font-semibold">P. Empate</th>
                                            <th className="py-2 px-2 text-right font-semibold">P. Derrota</th>
                                            <th className="py-2 px-2 text-right font-semibold bg-blue-50 dark:bg-blue-950/30 print:bg-gray-100">Total Pactado</th>
                                            <th className="py-2 px-2 text-right font-semibold bg-emerald-50 dark:bg-emerald-950/30 print:bg-gray-100">Total Pagado</th>
                                            <th className="py-2 px-2 text-right font-semibold bg-amber-50 dark:bg-amber-950/30 print:bg-gray-100">Saldo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map(({ a, ac, s }) => {
                                            const saldoColor = s.saldo > 0 ? "text-red-600 font-bold" : s.saldo === 0 ? "text-emerald-600" : "text-blue-600 font-bold";
                                            return (
                                                <tr key={a.id} className="border-b border-zinc-100 dark:border-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                                                    <td className="py-1.5 px-2 font-medium">{a.nombre_completo}</td>
                                                    <td className="py-1.5 px-2 font-mono">{a.documento || "-"}</td>
                                                    <td className="py-1.5 px-2 text-right">{fmt(s.pase)}</td>
                                                    <td className="py-1.5 px-2 text-right">{fmt(s.prima)}</td>
                                                    <td className="py-1.5 px-2 text-right">{fmt(ac?.viatico_practica)}</td>
                                                    <td className="py-1.5 px-2 text-right">{fmt(ac?.premio_victoria)}</td>
                                                    <td className="py-1.5 px-2 text-right">{fmt(ac?.premio_empate)}</td>
                                                    <td className="py-1.5 px-2 text-right">{fmt(ac?.premio_derrota)}</td>
                                                    <td className="py-1.5 px-2 text-right font-semibold">{fmt(s.totalPactado)}</td>
                                                    <td className="py-1.5 px-2 text-right font-semibold text-emerald-600">{fmt(s.totalPagado)}</td>
                                                    <td className={`py-1.5 px-2 text-right ${saldoColor}`}>{fmt(s.saldo)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="bg-zinc-100 dark:bg-zinc-900 font-bold text-xs">
                                        <tr>
                                            <td colSpan={2} className="py-2 px-2 uppercase">Subtotal {cat}</td>
                                            <td className="py-2 px-2 text-right">{fmt(sPase)}</td>
                                            <td className="py-2 px-2 text-right">{fmt(sPrima)}</td>
                                            <td className="py-2 px-2 text-right">{fmt(sVPract)}</td>
                                            <td className="py-2 px-2 text-right">{fmt(sPVict)}</td>
                                            <td className="py-2 px-2 text-right">{fmt(sPEmp)}</td>
                                            <td className="py-2 px-2 text-right">{fmt(sPDerr)}</td>
                                            <td className="py-2 px-2 text-right">{fmt(sPactado)}</td>
                                            <td className="py-2 px-2 text-right text-emerald-700">{fmt(sPagado)}</td>
                                            <td className={`py-2 px-2 text-right ${sSaldo > 0 ? "text-red-700" : sSaldo === 0 ? "text-emerald-700" : "text-blue-700"}`}>{fmt(sSaldo)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                                </div>
                            </div>
                        );
                    })}

                    {/* Grand Total */}
                    {keys.length > 0 && (
                        <div className="print:break-inside-avoid">
                            <table className="w-full text-xs border-collapse bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 print:bg-gray-800 print:text-white font-bold">
                                <tbody>
                                    <tr>
                                        <td colSpan={2} className="py-3 px-2 uppercase text-sm">Total General</td>
                                        <td className="py-3 px-2 text-right">{fmt(gPase)}</td>
                                        <td className="py-3 px-2 text-right">{fmt(gPrima)}</td>
                                        <td className="py-3 px-2 text-right">{fmt(gVPract)}</td>
                                        <td className="py-3 px-2 text-right">{fmt(gPVict)}</td>
                                        <td className="py-3 px-2 text-right">{fmt(gPEmp)}</td>
                                        <td className="py-3 px-2 text-right">{fmt(gPDerr)}</td>
                                        <td className="py-3 px-2 text-right">{fmt(gPactado)}</td>
                                        <td className="py-3 px-2 text-right text-emerald-300">{fmt(gPagado)}</td>
                                        <td className={`py-3 px-2 text-right ${gSaldo > 0 ? "text-red-300" : gSaldo === 0 ? "text-emerald-300" : "text-blue-300"}`}>{fmt(gSaldo)}</td>
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