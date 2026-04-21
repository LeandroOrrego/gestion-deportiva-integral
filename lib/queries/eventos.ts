"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type Evento = {
    id: string;
    fecha: string;
    tipo: "Partido" | "Practica";
    categoria_id: string | null;
    categorias: { id: string; nombre: string } | null;
    rival: string | null;
    resultado: "Victoria" | "Empate" | "Derrota" | null;
    estado: "Pendiente" | "Liquidado";
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
    asistencia_id: string | null; // null if no record yet
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

/**
 * Lista todos los eventos de la organización, ordenados por fecha descendente.
 */
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

/**
 * Obtiene el detalle de un evento específico.
 */
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

/**
 * Obtiene la lista de atletas de una categoría con su estado de asistencia
 * para un evento específico.
 */
export async function getAsistenciaEvento(
    eventoId: string,
    categoriaId: string | null
): Promise<AsistenciaAtleta[]> {
    const supabase = await createClient();
    const orgId = await getOrgId();
    if (!orgId) return [];

    // 1. Fetch athletes of this category
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

    // 2. Fetch existing attendance records for this event
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

    // 3. Merge
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

// ─────────────────────────────────────────────────────────────────────────────
// Server Actions
// ─────────────────────────────────────────────────────────────────────────────

export async function saveEvento(formData: {
    fecha: string;
    tipo: string;
    categoria_id: string;
    rival?: string;
    resultado?: string;
}): Promise<{ error: string | null; eventoId?: string }> {
    const supabase = await createClient();
    const orgId = await getOrgId();
    if (!orgId) return { error: "No se pudo obtener la organización." };

    const { data, error } = await supabase
        .from("eventos")
        .insert({
            fecha: formData.fecha,
            tipo: formData.tipo,
            categoria_id: formData.categoria_id || null,
            rival: formData.rival || null,
            resultado: formData.resultado || null,
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

/**
 * Guarda la asistencia para un evento.
 * Recibe un array de { atleta_id, asistio }.
 * Usa UPSERT sobre la constraint (evento_id, atleta_id).
 */
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

/**
 * Motor de Liquidación: calcula y registra los pagos de todos los atletas
 * que asistieron a un evento, basándose en sus acuerdos financieros.
 *
 * Para cada atleta asistente:
 * - Práctica: viatico_practica
 * - Partido: viatico_partido + premio según resultado (victoria/empate/derrota)
 *            o premio_fijo_resultado si está configurado.
 *
 * Inserta un movimiento HABER en atleta_movimientos y marca el evento como 'Liquidado'.
 */
export async function liquidarEvento(
    eventoId: string
): Promise<{ error: string | null; liquidados?: number }> {
    const supabase = await createClient();
    const orgId = await getOrgId();
    if (!orgId) return { error: "No se pudo obtener la organización." };

    // ── 1. Obtener el evento y validar estado ───────────────────────────────
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

    // Para partidos, verificar que haya un resultado cargado
    if (evento.tipo === "Partido" && !evento.resultado) {
        return { error: "No se puede liquidar un partido sin resultado. Cargá el resultado primero." };
    }

    // ── 2. Obtener atletas que asistieron ───────────────────────────────────
    const { data: asistentes, error: asistError } = await supabase
        .from("evento_asistencia")
        .select("atleta_id")
        .eq("evento_id", eventoId)
        .eq("asistio", true);

    if (asistError) {
        return { error: `Error al obtener asistencia: ${asistError.message}` };
    }

    if (!asistentes || asistentes.length === 0) {
        return { error: "No hay atletas con asistencia marcada para liquidar." };
    }

    // Extraer los UUIDs reales de atletas desde evento_asistencia
    const atletaIds: string[] = asistentes.map((a: any) => String(a.atleta_id));

    // ── 3. Obtener acuerdos financieros de los asistentes ───────────────────
    const { data: atletasRaw, error: atletasError } = await supabase
        .from("atletas")
        .select(`
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
        `)
        .in("id", atletaIds);

    if (atletasError) {
        return { error: `Error al obtener datos de atletas: ${atletasError.message}` };
    }

    // Crear un mapa: atletaId -> { nombre, acuerdo }
    const atletaMap = new Map<string, { nombre: string; acuerdo: any }>();
    for (const row of atletasRaw || []) {
        const agreements: any[] = Array.isArray(row.athlete_agreements)
            ? row.athlete_agreements
            : row.athlete_agreements
                ? [row.athlete_agreements]
                : [];

        const acuerdo = agreements.find((a: any) => a.temporada === "2026");
        if (acuerdo) {
            atletaMap.set(String(row.id), {
                nombre: row.nombre_completo,
                acuerdo,
            });
        }
    }

    // ── 4. Calcular pagos iterando por los IDs originales de asistencia ──────
    const fechaHoy = new Date().toISOString().split("T")[0];
    const movimientos: {
        organization_id: string;
        atleta_id: string;
        fecha: string;
        tipo: string;
        concepto: string;
        monto: number;
    }[] = [];
    let liquidados = 0;

    for (const atletaId of atletaIds) {
        const info = atletaMap.get(atletaId);
        if (!info) continue; // Sin acuerdo 2026, skip

        const { acuerdo } = info;
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

        // ✅ atletaId proviene directamente de evento_asistencia.atleta_id
        movimientos.push({
            organization_id: orgId,
            atleta_id: atletaId,
            fecha: fechaHoy,
            tipo: "HABER",
            concepto,
            monto: Math.round(monto),
        });

        liquidados++;
    }

    // ── 5. Insertar todos los movimientos en batch ──────────────────────────
    if (movimientos.length > 0) {
        const { error: insertError } = await supabase
            .from("atleta_movimientos")
            .insert(movimientos);

        if (insertError) {
            return { error: `Error al insertar movimientos: ${insertError.message}` };
        }
    }

    // ── 6. Marcar evento como Liquidado ─────────────────────────────────────
    const { error: updateError } = await supabase
        .from("eventos")
        .update({ estado: "Liquidado", updated_at: new Date().toISOString() })
        .eq("id", eventoId);

    if (updateError) {
        return { error: `Movimientos insertados pero error al actualizar estado: ${updateError.message}` };
    }

    // ── 7. Revalidar rutas ──────────────────────────────────────────────────
    revalidatePath(`/eventos/${eventoId}`);
    revalidatePath("/eventos");
    for (const atletaId of atletaIds) {
        revalidatePath(`/atletas/${atletaId}`);
    }

    return { error: null, liquidados };
}
