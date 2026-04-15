"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AtletaConAcuerdo = {
    id: string;
    nombre_completo: string;
    documento: string | null;
    posicion: string | null;
    status: string;
    category_id: string | null;
    categorias: { id: string; nombre: string } | null;
    acuerdo_2026: {
        id: string;
        temporada: string;
        premio_victoria: number;
        premio_empate: number;
        premio_derrota: number;
        viatico_base: number;
        costo_pase: number;
        prima_inicial: number;
        viatico_practica: number;
        viatico_partido: number;
        premio_fijo_resultado: number;
        premio_clasificacion: number;
        premio_campeonato: number;
        vigente_desde: string;
        vigente_hasta: string | null;
    } | null;
};

export type AgreementFormData = {
    costo_pase: number;
    prima_inicial: number;
    viatico_practica: number;
    viatico_partido: number;
    premio_victoria: number;
    premio_empate: number;
    premio_derrota: number;
    premio_fijo_resultado: number;
    premio_clasificacion: number;
    premio_campeonato: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches all active athletes for the authenticated user's organization,
 * joining with their 2026 agreement (if any) and their category (plantel).
 */
export async function getAthletes(): Promise<AtletaConAcuerdo[]> {
    const supabase = await createClient();

    // 1. Get the org_id of the logged-in user
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { data: perfil } = await supabase
        .from("perfiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

    if (!perfil?.organization_id) return [];

    const orgId = perfil.organization_id;

    // 2. Fetch athletes with their category + 2026 agreement
    const { data, error } = await supabase
        .from("atletas")
        .select(`
            id,
            nombre_completo,
            documento,
            posicion,
            status,
            category_id,
            categorias ( id, nombre ),
            athlete_agreements!atleta_id (
                id,
                temporada,
                viatico_base,
                premio_victoria,
                premio_empate,
                premio_derrota,
                costo_pase,
                prima_inicial,
                viatico_practica,
                viatico_partido,
                premio_fijo_resultado,
                premio_clasificacion,
                premio_campeonato,
                vigente_desde,
                vigente_hasta
            )
        `)
        .eq("organization_id", orgId)
        .eq("active", true)
        .is("deleted_at", null)
        .order("nombre_completo");

    if (error) {
        console.error("[getAthletes] Error:", error.message);
        return [];
    }

    // 3. Normalize: pick only the 2026 agreement per athlete
    const athletes: AtletaConAcuerdo[] = (data || []).map((row: any) => {
        const agreements: any[] = Array.isArray(row.athlete_agreements)
            ? row.athlete_agreements
            : row.athlete_agreements
            ? [row.athlete_agreements]
            : [];

        const acuerdo2026 =
            agreements.find((a) => a.temporada === "2026") ?? null;

        return {
            id: row.id,
            nombre_completo: row.nombre_completo,
            documento: row.documento ?? null,
            posicion: row.posicion ?? null,
            status: row.status ?? "active",
            category_id: row.category_id ?? null,
            categorias: row.categorias ?? null,
            acuerdo_2026: acuerdo2026,
        };
    });

    return athletes;
}

// ─────────────────────────────────────────────────────────────────────────────
// Server Action
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upserts an athlete_agreement record for a given athlete.
 * Returns { error: string | null }.
 */
export async function saveAthleteAgreement(
    atletaId: string,
    formData: AgreementFormData,
    existingAgreementId?: string
): Promise<{ error: string | null }> {
    "use server";

    const supabase = await createClient();

    // Get org_id
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "No autenticado" };

    const { data: perfil } = await supabase
        .from("perfiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

    if (!perfil?.organization_id) return { error: "Organización no encontrada" };

    const payload = {
        organization_id: perfil.organization_id,
        atleta_id: atletaId,
        temporada: "2026",
        vigente_desde: new Date().toISOString().split("T")[0],
        // Map all amounts — coerce to integer
        costo_pase: Math.round(Number(formData.costo_pase) || 0),
        prima_inicial: Math.round(Number(formData.prima_inicial) || 0),
        viatico_practica: Math.round(Number(formData.viatico_practica) || 0),
        viatico_partido: Math.round(Number(formData.viatico_partido) || 0),
        premio_victoria: Math.round(Number(formData.premio_victoria) || 0),
        premio_empate: Math.round(Number(formData.premio_empate) || 0),
        premio_derrota: Math.round(Number(formData.premio_derrota) || 0),
        // viatico_base maps to viatico_partido (backward-compat column)
        viatico_base: Math.round(Number(formData.viatico_partido) || 0),
        // Extra columns — only write if they exist in DB
        // These fields require a migration if not present yet.
        // Comment them out if the migration hasn't been applied.
        costo_pase_raw: Math.round(Number(formData.costo_pase) || 0),
        prima_inicial_raw: Math.round(Number(formData.prima_inicial) || 0),
        premio_fijo_resultado: Math.round(Number(formData.premio_fijo_resultado) || 0),
        premio_clasificacion: Math.round(Number(formData.premio_clasificacion) || 0),
        premio_campeonato: Math.round(Number(formData.premio_campeonato) || 0),
    };

    // Strip unknown columns – only keep what the current schema has
    const safePayload: Record<string, any> = {
        organization_id: payload.organization_id,
        atleta_id: payload.atleta_id,
        temporada: payload.temporada,
        vigente_desde: payload.vigente_desde,
        viatico_base: payload.viatico_base,
        premio_victoria: payload.premio_victoria,
        premio_empate: payload.premio_empate,
        premio_derrota: payload.premio_derrota,
    };

    let error;

    if (existingAgreementId) {
        // UPDATE existing
        const result = await supabase
            .from("athlete_agreements")
            .update({
                ...safePayload,
                updated_at: new Date().toISOString(),
            })
            .eq("id", existingAgreementId);
        error = result.error;
    } else {
        // INSERT new
        const result = await supabase
            .from("athlete_agreements")
            .insert(safePayload);
        error = result.error;
    }

    if (error) {
        console.error("[saveAthleteAgreement] Error:", error.message);
        return { error: error.message };
    }

    revalidatePath("/atletas");
    return { error: null };
}
