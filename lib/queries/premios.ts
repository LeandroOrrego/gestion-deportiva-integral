"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type Plantel = {
    id: string;
    nombre: string;
};

export type AcuerdoSimplificado = {
    id: string;
    es_premio_fijo: boolean;
    premio_fijo_resultado: number;
    premio_victoria: number;
    premio_empate: number;
    premio_derrota: number;
} | null;

export type Convocable = {
    id: string;
    nombre_completo: string;
    acuerdo: AcuerdoSimplificado;
};

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches all categories to populate the Plantel selector.
 */
export async function getPlanteles(): Promise<Plantel[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("categorias")
        .select("id, nombre")
        .order("nombre");

    if (error) {
        console.error("[getPlanteles] Error:", error.message);
        return [];
    }
    return data || [];
}

/**
 * Fetches athletes in a specific category along with their 2026 agreement.
 */
export async function getConvocables(categoryId: string): Promise<Convocable[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("atletas")
        .select(`
            id,
            nombre_completo,
            athlete_agreements!atleta_id (
                id,
                temporada,
                es_premio_fijo,
                premio_fijo_resultado,
                premio_victoria,
                premio_empate,
                premio_derrota
            )
        `)
        .eq("category_id", categoryId)
        .eq("active", true)
        .is("deleted_at", null)
        .order("nombre_completo");

    if (error) {
        console.error("[getConvocables] Error:", error.message);
        return [];
    }

    return (data || []).map((atleta: any) => {
        const agreements = Array.isArray(atleta.athlete_agreements)
            ? atleta.athlete_agreements
            : atleta.athlete_agreements
            ? [atleta.athlete_agreements]
            : [];

        const acuerdo2026 = agreements.find((a: any) => a.temporada === "2026") || null;

        return {
            id: atleta.id,
            nombre_completo: atleta.nombre_completo,
            acuerdo: acuerdo2026 ? {
                id: acuerdo2026.id,
                es_premio_fijo: !!acuerdo2026.es_premio_fijo,
                premio_fijo_resultado: Number(acuerdo2026.premio_fijo_resultado) || 0,
                premio_victoria: Number(acuerdo2026.premio_victoria) || 0,
                premio_empate: Number(acuerdo2026.premio_empate) || 0,
                premio_derrota: Number(acuerdo2026.premio_derrota) || 0,
            } : null,
        };
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Server Actions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mass inserts prize movements for multiple athletes.
 */
export async function generarPremiosMasivos(movimientos: {
    atleta_id: string;
    fecha: string;
    concepto: string;
    monto: number;
}[]): Promise<{ success?: boolean; error?: string }> {
    "use server";

    const supabase = await createClient();

    // 1. Get organization_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado" };

    const { data: perfil } = await supabase
        .from("perfiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

    if (!perfil?.organization_id) return { error: "Organización no encontrada" };

    // 2. Map payload with organization_id and type "HABER"
    const payload = movimientos.map(m => ({
        organization_id: perfil.organization_id,
        atleta_id: m.atleta_id,
        fecha: m.fecha,
        concepto: m.concepto,
        monto: Math.round(m.monto),
        tipo: "HABER"
    }));

    // 3. Batch insert
    const { error } = await supabase
        .from("atleta_movimientos")
        .insert(payload);

    if (error) {
        console.error("[generarPremiosMasivos] Error:", error.message);
        return { error: error.message };
    }

    // 4. Revalidate cache
    revalidatePath("/atletas");
    revalidatePath("/premios");

    return { success: true };
}
