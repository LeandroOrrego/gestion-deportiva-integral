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
