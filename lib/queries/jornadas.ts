"use server";

import { createClient } from "@/lib/supabase/server";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type Jornada = {
    id: string;
    numero: number;
    fecha: string;
    rival: string | null;
    ubicacion: "home" | "away" | null;
    temporada: string | null;
    organization_id: string;
};

export type EventoResultado = {
    id: string;
    jornada_id: string;
    category_id: string | null;
    resultado: string | null;
    goles_favor: number | null;
    goles_contra: number | null;
    categorias: { nombre: string } | null;
};

export type JornadaTransaccion = {
    id: string;
    fecha: string;
    flow: "income" | "expense";
    fondo: string;
    monto: number;
    descripcion: string | null;
    es_transferencia: boolean;
    transaction_types: { nombre: string } | null;
    categorias: { nombre: string } | null;
    entidades: { nombre: string } | null;
    category_id: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches all jornadas for an organization, ordered by numero descending.
 */
export async function getJornadas(organizationId: string): Promise<Jornada[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("jornadas")
        .select("*")
        .eq("organization_id", organizationId)
        .order("numero", { ascending: false });

    if (error) {
        console.error("[getJornadas] Error:", error.message);
        return [];
    }

    return data || [];
}

/**
 * Fetches match results (eventos) for a specific jornada.
 */
export async function getEventosByJornada(jornadaId: string): Promise<EventoResultado[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("eventos")
        .select(`
            id,
            jornada_id,
            category_id,
            resultado,
            goles_favor,
            goles_contra,
            categorias ( nombre )
        `)
        .eq("jornada_id", jornadaId)
        .order("category_id");

    if (error) {
        console.error("[getEventosByJornada] Error:", error.message);
        return [];
    }

    return (data || []) as unknown as EventoResultado[];
}

/**
 * Fetches all transactions linked to a specific jornada.
 * Excludes transfers and Movimiento/Caja type.
 */
export async function getTransaccionesByJornada(
    organizationId: string,
    jornadaId: string
): Promise<JornadaTransaccion[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("transacciones")
        .select(`
            id,
            fecha,
            flow,
            fondo,
            monto,
            descripcion,
            es_transferencia,
            category_id,
            transaction_types ( nombre ),
            categorias ( nombre ),
            entidades ( nombre )
        `)
        .eq("organization_id", organizationId)
        .eq("jornada_id", jornadaId)
        .eq("status", "confirmed")
        .is("deleted_at", null);

    if (error) {
        console.error("[getTransaccionesByJornada] Error:", error.message);
        return [];
    }

    // Filter out transfers and Movimiento/Caja client-side for simplicity
    const filtered = (data || []).filter((t: any) => {
        if (t.es_transferencia) return false;
        if (t.transaction_types?.nombre === "Movimiento/Caja") return false;
        return true;
    });

    return filtered as unknown as JornadaTransaccion[];
}
