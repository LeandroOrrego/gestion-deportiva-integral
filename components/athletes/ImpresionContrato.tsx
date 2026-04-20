"use client";

import { AtletaConAcuerdo } from "@/lib/queries/atletas";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function ImpresionContrato({ atleta }: { atleta: AtletaConAcuerdo }) {
    const acuerdo = atleta.acuerdo_2026;

    // Si no hay acuerdo, mostramos un mensaje amigable en la impresión
    if (!acuerdo) {
        return (
            <div className="hidden print:block p-10 text-center border-2 border-dashed">
                <h1 className="text-xl font-bold">Sin Acuerdo Registrado</h1>
                <p>Este atleta no tiene un acuerdo financiero cargado para la temporada 2026.</p>
            </div>
        );
    }

    return (
        <div className="hidden print:block print:w-full bg-white text-black p-12 font-serif text-sm leading-relaxed">
            {/* CABECERA */}
            <div className="text-center mb-10">
                <img src="/logo.png" alt="Logo Club" className="h-20 mx-auto mb-4 object-contain" />
                <h1 className="text-2xl font-bold uppercase">Club Naranjal</h1>
                <h2 className="text-lg font-semibold border-b-2 border-black inline-block px-4 pb-1 mt-2">
                    Acuerdo Deportivo - Temporada 2026
                </h2>
            </div>

            {/* CUERPO LEGAL */}
            <div className="space-y-6 text-justify">
                <p>
                    Conste por el presente documento el acuerdo deportivo celebrado entre el <strong>CLUB NARANJAL</strong>
                    y el atleta <strong>{atleta.nombre_completo}</strong>, con Documento de Identidad Nro. <strong>{atleta.documento || "__________"}</strong>,
                    quien se desempeña en el plantel de <strong>{atleta.categorias?.nombre || "General"}</strong>.
                </p>

                <section>
                    <h3 className="font-bold border-b border-gray-300 mb-2">1. CONDICIONES DE FICHAJE</h3>
                    <p>El Club acuerda el pago de Gs. {acuerdo.costo_pase.toLocaleString("es-PY")} en concepto de costo de pase
                        y un monto de Gs. {acuerdo.prima_inicial.toLocaleString("es-PY")} como prima por firma de contrato.</p>
                </section>

                <section>
                    <h3 className="font-bold border-b border-gray-300 mb-2">2. VIÁTICOS Y MOVILIDAD</h3>
                    <p>Se establece un viático de Gs. {acuerdo.viatico_practica.toLocaleString("es-PY")} por cada sesión de práctica asistida
                        y Gs. {acuerdo.viatico_partido.toLocaleString("es-PY")} por cada partido oficial convocado.</p>
                </section>

                <section>
                    <h3 className="font-bold border-b border-gray-300 mb-2">3. PREMIOS POR RENDIMIENTO</h3>
                    {acuerdo.premio_fijo_resultado > 0 ? (
                        <p>El atleta percibirá un premio único de <strong>Gs. {acuerdo.premio_fijo_resultado.toLocaleString("es-PY")}</strong> por partido, independientemente del resultado obtenido.</p>
                    ) : (
                        <ul className="list-disc ml-6">
                            <li>Victoria: Gs. {acuerdo.premio_victoria.toLocaleString("es-PY")}</li>
                            <li>Empate: Gs. {acuerdo.premio_empate.toLocaleString("es-PY")}</li>
                            <li>Derrota: Gs. {acuerdo.premio_derrota.toLocaleString("es-PY")}</li>
                        </ul>
                    )}
                </section>
            </div>

            {/* FIRMAS */}
            <div className="mt-24 grid grid-cols-3 gap-8 text-center uppercase text-[10px]">
                <div className="border-t border-black pt-2">Atleta<br />{atleta.nombre_completo}</div>
                <div className="border-t border-black pt-2">Presidente<br />Club Naranjal</div>
                <div className="border-t border-black pt-2">Tesorero<br />Club Naranjal</div>
            </div>

            <div className="mt-10 text-[10px] text-gray-400 text-right italic">
                Documento generado el {format(new Date(), "PPP", { locale: es })}
            </div>
        </div>
    );
}
