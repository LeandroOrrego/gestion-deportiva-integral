import { getAthletes } from "@/lib/queries/atletas";
import { PrintButton } from "../comision/PrintButton";

export const dynamic = "force-dynamic";

export default async function PrevisionPremiacionPage() {
    const todosAtletas = await getAthletes();

    const categoriasPermitidas = ["Primera", "Sub-19", "Sub-16"];
    const atletasFiltrados = todosAtletas.filter(a => {
        const cat = a.categorias?.nombre;
        return cat && categoriasPermitidas.includes(cat);
    });

    const agrupados = atletasFiltrados.reduce((acc, a) => {
        const cat = a.categorias?.nombre || "Sin Categoría";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(a);
        return acc;
    }, {} as Record<string, typeof atletasFiltrados>);

    const keys = categoriasPermitidas.filter(k => agrupados[k]);

    const fmt = (n: number | undefined | null) => {
        if (!n || n === 0) return "-";
        return new Intl.NumberFormat("es-PY").format(n);
    };

    let gPremio = 0, gBonoSF = 0, gTotalSF = 0, gBonoFinal = 0, gTotalFinal = 0;

    return (
        <div className="flex-1 p-8 pt-6 print:p-0">
            <div className="print:hidden flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Previsión de Premiación</h2>
                    <p className="text-muted-foreground">Proyección de bonos por objetivos (Semifinal y Final) sobre partidos ganados.</p>
                </div>
                <PrintButton />
            </div>

            <div id="reporte-impresion" className="print:bg-white print:text-black">
                <div className="hidden print:block mb-6 text-center">
                    <h1 className="text-2xl font-bold uppercase">Club Deportivo Naranjal</h1>
                    <h2 className="text-lg border-b-2 border-black inline-block px-4 pb-1">
                        Reporte de Previsión de Premiación
                    </h2>
                </div>

                <div className="space-y-10 print:space-y-6">
                    {keys.length === 0 && (
                        <p className="text-center text-muted-foreground mt-10">No hay atletas registrados en las categorías en competencia.</p>
                    )}

                    {keys.map(cat => {
                        let sPremio = 0, sBonoSF = 0, sTotalSF = 0, sBonoFinal = 0, sTotalFinal = 0;
                        let missingCount = 0;

                        const rows = agrupados[cat].map(a => {
                            const ac = a.acuerdo_2026;
                            const premioVictoria = Number(ac?.premio_victoria) || 0;
                            const hasAgreement = ac && premioVictoria > 0;
                            
                            if (!hasAgreement) missingCount++;
                            
                            const bonoSF = premioVictoria * 0.25;
                            const totalSF = premioVictoria + bonoSF;
                            const bonoFinal = premioVictoria * 0.50;
                            const totalFinal = premioVictoria + bonoFinal;

                            sPremio += premioVictoria;
                            sBonoSF += bonoSF;
                            sTotalSF += totalSF;
                            sBonoFinal += bonoFinal;
                            sTotalFinal += totalFinal;

                            return { a, premioVictoria, bonoSF, totalSF, bonoFinal, totalFinal, hasAgreement };
                        });

                        gPremio += sPremio;
                        gBonoSF += sBonoSF;
                        gTotalSF += sTotalSF;
                        gBonoFinal += sBonoFinal;
                        gTotalFinal += sTotalFinal;

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
                                                <th className="py-2 px-2 text-right font-semibold">Premio Victoria</th>
                                                <th className="py-2 px-2 text-right font-semibold bg-blue-50 dark:bg-blue-950/30 print:bg-gray-50">Bono Clasificación (25%)</th>
                                                <th className="py-2 px-2 text-right font-semibold bg-blue-100 dark:bg-blue-900/40 print:bg-gray-100">Total SF Vuelta</th>
                                                <th className="py-2 px-2 text-right font-semibold bg-amber-50 dark:bg-amber-950/30 print:bg-gray-50">Bono Campeonato (50%)</th>
                                                <th className="py-2 px-2 text-right font-semibold bg-amber-100 dark:bg-amber-900/40 print:bg-gray-100">Total Final Vuelta</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.map(({ a, premioVictoria, bonoSF, totalSF, bonoFinal, totalFinal, hasAgreement }) => (
                                                <tr key={a.id} className="border-b border-zinc-100 dark:border-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                                                    <td className="py-1.5 px-2 font-medium">{a.nombre_completo}</td>
                                                    <td className="py-1.5 px-2 font-mono">{a.documento || "-"}</td>
                                                    <td className="py-1.5 px-2 text-right">
                                                        {hasAgreement ? (
                                                            fmt(premioVictoria)
                                                        ) : (
                                                            <span className="text-red-500 font-semibold italic">Sin acuerdo cargado</span>
                                                        )}
                                                    </td>
                                                    <td className="py-1.5 px-2 text-right text-blue-600 dark:text-blue-400 font-medium">{hasAgreement ? fmt(bonoSF) : "-"}</td>
                                                    <td className="py-1.5 px-2 text-right text-blue-700 dark:text-blue-300 font-bold">{hasAgreement ? fmt(totalSF) : "-"}</td>
                                                    <td className="py-1.5 px-2 text-right text-amber-600 dark:text-amber-400 font-medium">{hasAgreement ? fmt(bonoFinal) : "-"}</td>
                                                    <td className="py-1.5 px-2 text-right text-amber-700 dark:text-amber-300 font-bold">{hasAgreement ? fmt(totalFinal) : "-"}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-zinc-100 dark:bg-zinc-900 font-bold text-xs">
                                            <tr>
                                                <td colSpan={2} className="py-2 px-2 uppercase">Subtotal {cat}</td>
                                                <td className="py-2 px-2 text-right">{fmt(sPremio)}</td>
                                                <td className="py-2 px-2 text-right text-blue-700 dark:text-blue-400">{fmt(sBonoSF)}</td>
                                                <td className="py-2 px-2 text-right text-blue-800 dark:text-blue-300">{fmt(sTotalSF)}</td>
                                                <td className="py-2 px-2 text-right text-amber-700 dark:text-amber-400">{fmt(sBonoFinal)}</td>
                                                <td className="py-2 px-2 text-right text-amber-800 dark:text-amber-300">{fmt(sTotalFinal)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                    {missingCount > 0 && (
                                        <p className="mt-2 text-xs italic text-gray-500 dark:text-gray-400">
                                            {missingCount} de {agrupados[cat].length} jugadores sin acuerdo cargado — el total de esta categoría no incluye sus premios.
                                        </p>
                                    )}
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
                                        <td className="py-3 px-2 text-right">{fmt(gPremio)}</td>
                                        <td className="py-3 px-2 text-right text-blue-300 dark:text-blue-600">{fmt(gBonoSF)}</td>
                                        <td className="py-3 px-2 text-right text-blue-200 dark:text-blue-700">{fmt(gTotalSF)}</td>
                                        <td className="py-3 px-2 text-right text-amber-300 dark:text-amber-600">{fmt(gBonoFinal)}</td>
                                        <td className="py-3 px-2 text-right text-amber-200 dark:text-amber-700">{fmt(gTotalFinal)}</td>
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
                    tfoot tr, tfoot td { background-color: #e5e7eb !important; color: black !important; }
                }
            `}} />
        </div>
    );
}
