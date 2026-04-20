import { getAthletes } from "@/lib/queries/atletas";
import { PrintButton } from "./PrintButton";

// Forzamos a Next.js a recalcular la página en cada clic, apagando la memoria caché
export const dynamic = "force-dynamic";

export default async function ReporteComisionPage({
    searchParams
}: {
    searchParams: Promise<{ cat?: string, cols?: string }> | { cat?: string, cols?: string }
}) {
    const atletas = await getAthletes();

    // Esperamos a que Next.js lea la URL correctamente (Compatible con Next 14 y 15)
    const sp = await searchParams;

    // 1. LÓGICA DE FILTRADO POR CATEGORÍA
    const catFilter = sp?.cat;
    const atletasFiltrados = atletas.filter(a => {
        if (!catFilter || catFilter.toLowerCase() === "todas") return true;
        return a.categorias?.nombre === catFilter || a.categorias?.id === catFilter;
    });

    // 2. LÓGICA DE VISIBILIDAD DE COLUMNAS
    const cols = sp?.cols || "";
    const showFichaje = !cols || cols.includes('fichaje');
    const showViaticos = !cols || cols.includes('viaticos');
    const showPremios = !cols || cols.includes('premios');
    const showObjetivos = !cols || cols.includes('objetivos');

    // Agrupación de los atletas ya filtrados
    const agrupados = atletasFiltrados.reduce((acc, atleta) => {
        const cat = atleta.categorias?.nombre || "Sin Categoría";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(atleta);
        return acc;
    }, {} as Record<string, typeof atletasFiltrados>);

    // Ordenamiento de las categorías
    const order = ["Primera", "Sub-20", "Sub-19", "Sub-16", "Sub-14"];
    const keys = Object.keys(agrupados).sort((a, b) => {
        const indexA = order.indexOf(a);
        const indexB = order.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
    });

    const formatGs = (num: number | undefined | null) => {
        if (!num || num === 0) return "-";
        return new Intl.NumberFormat("es-PY").format(num);
    };

    return (
        <div className="flex-1 p-8 pt-6 print:p-0">
            {/* Cabecera Web */}
            <div className="print:hidden flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Reporte de Previsión Financiera</h2>
                    <p className="text-muted-foreground">Listado dinámico generado según filtros.</p>
                </div>
                <PrintButton />
            </div>

            {/* Contenedor estricto para Impresión */}
            <div id="reporte-impresion" className="print:bg-white print:text-black">
                <div className="hidden print:block mb-6 text-center">
                    <h1 className="text-2xl font-bold uppercase">Club Deportivo Naranjal</h1>
                    <h2 className="text-lg border-b-2 border-black inline-block px-4 pb-1">
                        Reporte Financiero {catFilter && catFilter !== "todas" ? `- Categoría ${catFilter}` : "General"}
                    </h2>
                </div>

                <div className="space-y-12 print:space-y-8">
                    {keys.length === 0 && (
                        <p className="text-center text-muted-foreground mt-10">No hay atletas registrados en esta categoría con los filtros actuales.</p>
                    )}

                    {keys.map(cat => {
                        // Variables para Subtotales
                        let sPase = 0, sPrima = 0, sVPract = 0, sVPart = 0;
                        let sVict = 0, sEmp = 0, sDerr = 0, sClas = 0, sCamp = 0;

                        agrupados[cat].forEach(a => {
                            const ac = a.acuerdo_2026;
                            if (ac) {
                                sPase += Number(ac.costo_pase) || 0;
                                sPrima += Number(ac.prima_inicial) || 0;
                                sVPract += Number(ac.viatico_practica) || 0;
                                sVPart += Number(ac.viatico_partido) || 0;
                                sClas += Number(ac.premio_clasificacion) || 0;
                                sCamp += Number(ac.premio_campeonato) || 0;
                                if (ac.premio_fijo_resultado === 0 || !ac.premio_fijo_resultado) {
                                    sVict += Number(ac.premio_victoria) || 0;
                                    sEmp += Number(ac.premio_empate) || 0;
                                    sDerr += Number(ac.premio_derrota) || 0;
                                }
                            }
                        });

                        return (
                            <div key={cat} className="print:break-inside-avoid">
                                <h3 className="text-xl font-bold mb-4 uppercase border-b border-gray-600 print:border-gray-300 pb-2">
                                    Categoría: {cat} <span className="text-sm font-normal text-gray-500">({agrupados[cat].length} jugadores)</span>
                                </h3>
                                <table className="w-full text-sm text-left border-collapse bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800">
                                    <thead>
                                        <tr className="border-b border-zinc-200 dark:border-zinc-800">
                                            <th className="py-2 px-2 font-semibold">Atleta</th>
                                            <th className="py-2 px-2 font-semibold">C.I.</th>
                                            {showFichaje && <th className="py-2 px-2 font-semibold text-right">Pase</th>}
                                            {showFichaje && <th className="py-2 px-2 font-semibold text-right">Prima</th>}
                                            {showViaticos && <th className="py-2 px-2 font-semibold text-right">V. Práct.</th>}
                                            {showViaticos && <th className="py-2 px-2 font-semibold text-right">V. Part.</th>}
                                            {showPremios && <th className="py-2 px-2 font-semibold text-right">P. Victoria</th>}
                                            {showPremios && <th className="py-2 px-2 font-semibold text-right">P. Empate</th>}
                                            {showPremios && <th className="py-2 px-2 font-semibold text-right">P. Derrota</th>}
                                            {showObjetivos && <th className="py-2 px-2 font-semibold text-right">Clasificación</th>}
                                            {showObjetivos && <th className="py-2 px-2 font-semibold text-right">Campeón</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {agrupados[cat].map(a => {
                                            const ac = a.acuerdo_2026;
                                            return (
                                                <tr key={a.id} className="border-b border-zinc-100 dark:border-zinc-900">
                                                    <td className="py-2 px-2">{a.nombre_completo}</td>
                                                    <td className="py-2 px-2">{a.documento || "-"}</td>
                                                    {showFichaje && <td className="py-2 px-2 text-right">{formatGs(ac?.costo_pase)}</td>}
                                                    {showFichaje && <td className="py-2 px-2 text-right">{formatGs(ac?.prima_inicial)}</td>}
                                                    {showViaticos && <td className="py-2 px-2 text-right">{formatGs(ac?.viatico_practica)}</td>}
                                                    {showViaticos && <td className="py-2 px-2 text-right">{formatGs(ac?.viatico_partido)}</td>}

                                                    {showPremios && (
                                                        ac?.premio_fijo_resultado && ac.premio_fijo_resultado > 0 ? (
                                                            <td colSpan={3} className="py-2 px-2 text-center italic text-muted-foreground print:text-black">
                                                                Monto Fijo: {formatGs(ac.premio_fijo_resultado)}
                                                            </td>
                                                        ) : (
                                                            <>
                                                                <td className="py-2 px-2 text-right">{formatGs(ac?.premio_victoria)}</td>
                                                                <td className="py-2 px-2 text-right">{formatGs(ac?.premio_empate)}</td>
                                                                <td className="py-2 px-2 text-right">{formatGs(ac?.premio_derrota)}</td>
                                                            </>
                                                        )
                                                    )}

                                                    {showObjetivos && <td className="py-2 px-2 text-right">{formatGs(ac?.premio_clasificacion)}</td>}
                                                    {showObjetivos && <td className="py-2 px-2 text-right">{formatGs(ac?.premio_campeonato)}</td>}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="bg-zinc-100 dark:bg-zinc-900 font-bold">
                                        <tr>
                                            <td colSpan={2} className="py-2 px-2 uppercase">Subtotal</td>
                                            {showFichaje && <td className="py-2 px-2 text-right">{formatGs(sPase)}</td>}
                                            {showFichaje && <td className="py-2 px-2 text-right">{formatGs(sPrima)}</td>}
                                            {showViaticos && <td className="py-2 px-2 text-right">{formatGs(sVPract)}</td>}
                                            {showViaticos && <td className="py-2 px-2 text-right">{formatGs(sVPart)}</td>}
                                            {showPremios && <td className="py-2 px-2 text-right">{formatGs(sVict)}</td>}
                                            {showPremios && <td className="py-2 px-2 text-right">{formatGs(sEmp)}</td>}
                                            {showPremios && <td className="py-2 px-2 text-right">{formatGs(sDerr)}</td>}
                                            {showObjetivos && <td className="py-2 px-2 text-right">{formatGs(sClas)}</td>}
                                            {showObjetivos && <td className="py-2 px-2 text-right">{formatGs(sCamp)}</td>}
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )
                    })}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { size: A4 landscape; margin: 10mm; }
                    body, html { background: white !important; color: black !important; }
                    body * { visibility: hidden; }
                    #reporte-impresion, #reporte-impresion * { visibility: visible; }
                    #reporte-impresion { position: absolute; left: 0; top: 0; width: 100%; margin: 0; }
                    table, tr, td, th, thead, tbody, tfoot { 
                        background-color: white !important; 
                        color: black !important; 
                        border-color: #ccc !important; 
                    }
                    tfoot tr, tfoot td { background-color: #e5e7eb !important; }
                }
            `}} />
        </div>
    );
}