"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { todayLocal } from "@/lib/utils/date";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type Evento = {
    id: string;
    fecha: string;
    tipo: "Partido" | "Practica" | null;
    categoria_id: string | null;
    categorias: { id: string; nombre: string } | null;
    rival: string | null;
    resultado: "Victoria" | "Empate" | "Derrota" | null;
    estado: "Pendiente" | "Liquidado";
    jornada: string | null;
    organization_id: string;
    created_at: string;
};

export type EventoDetalle = Evento;

export type AsistenciaAtleta = {
    atleta_id: string;
    nombre_completo: string;
    documento: string | null;
    posicion: string | null;
    asistio: boolean;
    asistencia_id: string | null;
};

export type AsistenciaConMonto = {
    atleta_id: string;
    nombre_completo: string;
    documento: string | null;
    posicion: string | null;
    asistio: boolean;
    asistencia_id: string | null;
    monto_calculado: number;
    detalle_monto: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: get org_id from session
// ─────────────────────────────────────────────────────────────────────────────

async function getOrgId(): Promise<string | null> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: perfil } = await supabase
        .from("perfiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

    return perfil?.organization_id ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

export async function getEventos(): Promise<Evento[]> {
    const supabase = await createClient();
    const orgId = await getOrgId();
    if (!orgId) return [];

    const { data, error } = await supabase
        .from("eventos")
        .select(`
            id,
            fecha,
            tipo,
            categoria_id,
            categorias ( id, nombre ),
            rival,
            resultado,
            estado,
            jornada,
            organization_id,
            created_at
        `)
        .eq("organization_id", orgId)
        .order("fecha", { ascending: false });

    if (error) {
        console.error("[getEventos] Error:", error.message);
        return [];
    }

    return (data || []) as unknown as Evento[];
}

export async function getEventoDetalle(id: string): Promise<EventoDetalle | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("eventos")
        .select(`
            id,
            fecha,
            tipo,
            categoria_id,
            categorias ( id, nombre ),
            rival,
            resultado,
            estado,
            jornada,
            organization_id,
            created_at
        `)
        .eq("id", id)
        .single();

    if (error) {
        console.error("[getEventoDetalle] Error:", error.message);
        return null;
    }

    return data as unknown as EventoDetalle;
}

export async function getAsistenciaEvento(
    eventoId: string,
    categoriaId: string | null
): Promise<AsistenciaAtleta[]> {
    const supabase = await createClient();
    const orgId = await getOrgId();
    if (!orgId) return [];

    let query = supabase
        .from("atletas")
        .select("id, nombre_completo, documento, posicion")
        .eq("organization_id", orgId)
        .eq("active", true)
        .is("deleted_at", null)
        .order("nombre_completo");

    if (categoriaId) {
        query = query.eq("category_id", categoriaId);
    }

    const { data: atletas, error: atletasError } = await query;

    if (atletasError) {
        console.error("[getAsistenciaEvento] Error fetching athletes:", atletasError.message);
        return [];
    }

    const { data: asistencias, error: asistError } = await supabase
        .from("evento_asistencia")
        .select("id, atleta_id, asistio")
        .eq("evento_id", eventoId);

    if (asistError) {
        console.error("[getAsistenciaEvento] Error fetching attendance:", asistError.message);
    }

    const asistenciaMap = new Map(
        (asistencias || []).map((a: any) => [a.atleta_id, { id: a.id, asistio: a.asistio }])
    );

    return (atletas || []).map((atleta: any) => {
        const record = asistenciaMap.get(atleta.id);
        return {
            atleta_id: atleta.id,
            nombre_completo: atleta.nombre_completo,
            documento: atleta.documento,
            posicion: atleta.posicion,
            asistio: record?.asistio ?? false,
            asistencia_id: record?.id ?? null,
        };
    });
}

export async function getAsistenciaConMontos(
    eventoId: string,
    categoriaId: string | null,
    resultado: "Victoria" | "Empate" | "Derrota" | null,
    tipoEvento: "Partido" | "Practica" | null
): Promise<AsistenciaConMonto[]> {
    const supabase = await createClient();
    const orgId = await getOrgId();
    if (!orgId) return [];

    let query = supabase
        .from("atletas")
        .select(`
            id,
            nombre_completo,
            documento,
            posicion,
            athlete_agreements!atleta_id (
                temporada,
                viatico_practica,
                viatico_partido,
                premio_victoria,
                premio_empate,
                premio_derrota,
                premio_fijo_resultado
            )
        `)
        .eq("organization_id", orgId)
        .eq("active", true)
        .is("deleted_at", null)
        .order("nombre_completo");

    if (categoriaId) query = query.eq("category_id", categoriaId);

    const { data: atletas, error: atletasError } = await query;
    if (atletasError || !atletas) return [];

    const { data: asistencias } = await supabase
        .from("evento_asistencia")
        .select("id, atleta_id, asistio")
        .eq("evento_id", eventoId);

    const asistenciaMap = new Map(
        (asistencias || []).map((a: any) => [a.atleta_id, { id: a.id, asistio: a.asistio }])
    );

    return (atletas as any[]).map((atleta) => {
        const record = asistenciaMap.get(atleta.id);
        const asistio = record?.asistio ?? false;

        const agreements: any[] = Array.isArray(atleta.athlete_agreements)
            ? atleta.athlete_agreements
            : atleta.athlete_agreements ? [atleta.athlete_agreements] : [];

        const acuerdo = agreements.find((a: any) => a.temporada === "2026");

        let monto_calculado = 0;
        let detalle_monto = "Sin acuerdo";

        if (acuerdo) {
            if (tipoEvento === "Practica") {
                monto_calculado = Number(acuerdo.viatico_practica) || 0;
                detalle_monto = monto_calculado > 0
                    ? `Viático práctica: Gs. ${monto_calculado.toLocaleString("es-PY")}`
                    : "Sin viático";
            } else {
                const viatico = Number(acuerdo.viatico_partido) || 0;
                const premioFijo = Number(acuerdo.premio_fijo_resultado) || 0;
                let premio = 0;
                let labelPremio = "";

                if (premioFijo > 0) {
                    premio = premioFijo;
                    labelPremio = `Premio fijo: Gs. ${premio.toLocaleString("es-PY")}`;
                } else {
                    switch (resultado) {
                        case "Victoria":
                            premio = Number(acuerdo.premio_victoria) || 0;
                            labelPremio = premio > 0 ? `P. Victoria: Gs. ${premio.toLocaleString("es-PY")}` : "";
                            break;
                        case "Empate":
                            premio = Number(acuerdo.premio_empate) || 0;
                            labelPremio = premio > 0 ? `P. Empate: Gs. ${premio.toLocaleString("es-PY")}` : "";
                            break;
                        case "Derrota":
                            premio = Number(acuerdo.premio_derrota) || 0;
                            labelPremio = premio > 0 ? `P. Derrota: Gs. ${premio.toLocaleString("es-PY")}` : "";
                            break;
                    }
                }

                monto_calculado = viatico + premio;
                const partes = [];
                if (viatico > 0) partes.push(`Viático: Gs. ${viatico.toLocaleString("es-PY")}`);
                if (labelPremio) partes.push(labelPremio);
                detalle_monto = partes.length > 0 ? partes.join(" + ") : "Gs. 0";
            }
        }

        return {
            atleta_id: atleta.id,
            nombre_completo: atleta.nombre_completo,
            documento: atleta.documento,
            posicion: atleta.posicion,
            asistio,
            asistencia_id: record?.id ?? null,
            monto_calculado,
            detalle_monto,
        };
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Server Actions
// ─────────────────────────────────────────────────────────────────────────────

export async function saveEvento(formData: {
    fecha: string;
    tipo?: string;
    categoria_id?: string;
    rival?: string;
    resultado?: string;
    jornada?: string;
}): Promise<{ error: string | null; eventoId?: string }> {
    const supabase = await createClient();
    const orgId = await getOrgId();
    if (!orgId) return { error: "No se pudo obtener la organización." };

    const tipo = (formData.tipo && formData.tipo !== "none") ? formData.tipo : null;
    const categoriaId = (formData.categoria_id && formData.categoria_id !== "none") ? formData.categoria_id : null;

    const { data, error } = await supabase
        .from("eventos")
        .insert({
            fecha: formData.fecha,
            tipo,
            categoria_id: categoriaId,
            rival: formData.rival || null,
            resultado: formData.resultado || null,
            jornada: formData.jornada || null,
            estado: "Pendiente",
            organization_id: orgId,
        })
        .select("id")
        .single();

    if (error) {
        console.error("[saveEvento] Error:", error.message);
        return { error: error.message };
    }

    revalidatePath("/eventos");
    return { error: null, eventoId: data.id };
}

export async function saveAsistencia(
    eventoId: string,
    asistencias: { atleta_id: string; asistio: boolean }[]
): Promise<{ error: string | null }> {
    const supabase = await createClient();

    const rows = asistencias.map((a) => ({
        evento_id: eventoId,
        atleta_id: a.atleta_id,
        asistio: a.asistio,
        updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
        .from("evento_asistencia")
        .upsert(rows, { onConflict: "evento_id,atleta_id" });

    if (error) {
        console.error("[saveAsistencia] Error:", error.message);
        return { error: error.message };
    }

    revalidatePath(`/eventos/${eventoId}`);
    return { error: null };
}

export async function liquidarEvento(
    eventoId: string
): Promise<{ error: string | null; liquidados?: number }> {
    const supabase = await createClient();
    const orgId = await getOrgId();
    if (!orgId) return { error: "No se pudo obtener la organización." };

    const { data: evento, error: eventoError } = await supabase
        .from("eventos")
        .select("id, fecha, tipo, rival, resultado, estado, categoria_id")
        .eq("id", eventoId)
        .single();

    if (eventoError || !evento) {
        return { error: "No se encontró el evento." };
    }

    if (evento.estado === "Liquidado") {
        return { error: "Este evento ya fue liquidado." };
    }

    if (evento.tipo === "Partido" && !evento.resultado) {
        return { error: "No se puede liquidar un partido sin resultado. Cargá el resultado primero." };
    }

    const { data: asistentes, error: asistError } = await supabase
        .from("evento_asistencia")
        .select(`
            id,
            asistio,
            jugador:atletas!atleta_id (
                id,
                nombre_completo,
                athlete_agreements!atleta_id (
                    temporada,
                    viatico_practica,
                    viatico_partido,
                    premio_victoria,
                    premio_empate,
                    premio_derrota,
                    premio_fijo_resultado
                )
            )
        `)
        .eq("evento_id", eventoId)
        .eq("asistio", true);

    if (asistError) {
        console.error("[liquidarEvento] Error asistencia:", asistError.message);
        return { error: `Error al obtener asistencia: ${asistError.message}` };
    }

    if (!asistentes || asistentes.length === 0) {
        return { error: "No hay atletas con asistencia marcada para liquidar." };
    }

    const fechaHoy = todayLocal();
    const movimientos: {
        organization_id: string;
        atleta_id: string;
        fecha: string;
        tipo: string;
        concepto: string;
        monto: number;
    }[] = [];
    const atletaIdsAfectados: string[] = [];
    let liquidados = 0;

    for (const row of asistentes) {
        const jugador: any = row.jugador;
        if (!jugador) continue;

        const atletaId: string | null =
            typeof jugador === "object" && jugador !== null ? jugador.id : null;

        if (!atletaId || typeof atletaId !== "string" || atletaId.length < 30) {
            console.warn("[liquidarEvento] atleta_id inválido, saltando:", jugador);
            continue;
        }

        const agreements: any[] = Array.isArray(jugador.athlete_agreements)
            ? jugador.athlete_agreements
            : jugador.athlete_agreements ? [jugador.athlete_agreements] : [];

        const acuerdo = agreements.find((a: any) => a.temporada === "2026");
        if (!acuerdo) continue;

        let monto = 0;
        let concepto = "";

        if (evento.tipo === "Practica") {
            monto = Number(acuerdo.viatico_practica) || 0;
            concepto = `Liquidación: Práctica — ${evento.fecha}`;
        } else {
            const viatico = Number(acuerdo.viatico_partido) || 0;
            let premio = 0;

            const premioFijo = Number(acuerdo.premio_fijo_resultado) || 0;
            if (premioFijo > 0) {
                premio = premioFijo;
            } else {
                switch (evento.resultado) {
                    case "Victoria":
                        premio = Number(acuerdo.premio_victoria) || 0;
                        break;
                    case "Empate":
                        premio = Number(acuerdo.premio_empate) || 0;
                        break;
                    case "Derrota":
                        premio = Number(acuerdo.premio_derrota) || 0;
                        break;
                }
            }

            monto = viatico + premio;
            concepto = `Liquidación: Partido vs ${evento.rival || "Rival"} (${evento.resultado})`;
        }

        if (monto <= 0) continue;

        movimientos.push({
            organization_id: orgId,
            atleta_id: atletaId,
            fecha: fechaHoy,
            tipo: "HABER",
            concepto,
            monto: Math.round(monto),
        });

        atletaIdsAfectados.push(atletaId);
        liquidados++;
    }

    console.log("[liquidarEvento] PAYLOAD A INSERTAR:", JSON.stringify(movimientos, null, 2));

    if (movimientos.length > 0) {
        const { error: insertError } = await supabase
            .from("atleta_movimientos")
            .insert(movimientos);

        if (insertError) {
            console.error("[liquidarEvento] Insert Error:", insertError.message);
            return { error: `Error al insertar movimientos: ${insertError.message}` };
        }
    }

    const { error: updateError } = await supabase
        .from("eventos")
        .update({ estado: "Liquidado", updated_at: new Date().toISOString() })
        .eq("id", eventoId);

    if (updateError) {
        return { error: `Movimientos insertados pero error al actualizar estado: ${updateError.message}` };
    }

    revalidatePath(`/eventos/${eventoId}`);
    revalidatePath("/eventos");
    for (const id of atletaIdsAfectados) {
        revalidatePath(`/atletas/${id}`);
    }

    return { error: null, liquidados };
}
