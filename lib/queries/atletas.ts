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
    // Basic Data
    nombre_completo: string;
    documento: string;
    category_id: string;
    
    // Financial Data
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

export type MovimientoTipo = "DEBE" | "HABER";

export type MovimientoAtleta = {
    id: string;
    atleta_id: string;
    fecha: string;
    concepto: string;
    tipo: MovimientoTipo;
    monto: number;
    organization_id: string;
    created_at: string;
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

/**
 * Fetches basic profile info for a single athlete.
 */
export async function getAthleteProfile(id: string): Promise<AtletaConAcuerdo | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("atletas")
        .select(`
            id,
            nombre_completo,
            documento,
            posicion,
            status,
            category_id,
            categorias ( id, nombre )
        `)
        .eq("id", id)
        .single();

    if (error) {
        console.error("[getAthleteProfile] Error:", error.message);
        return null;
    }

    return {
        ...data,
        acuerdo_2026: null, // Basic profile doesn't need agreement for now, or fetch separately if needed
    } as AtletaConAcuerdo;
}

/**
 * Fetches all financial movements for an athlete, ordered by date and creation time descending.
 */
export async function getMovimientos(atletaId: string): Promise<MovimientoAtleta[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("atleta_movimientos")
        .select("*")
        .eq("atleta_id", atletaId)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[getMovimientos] Error:", error.message);
        return [];
    }

    return data || [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Server Action
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Records both athlete personal data and their agreement.
 * Performs a two-step process:
 * 1. UPSERT into 'atletas' table.
 * 2. UPSERT into 'athlete_agreements' table using the athlete's ID.
 */
export async function saveAthleteAgreement(
    formData: AgreementFormData,
    atletaId?: string,
    existingAgreementId?: string
): Promise<{ error: string | null }> {
    "use server";

    const supabase = await createClient();

    // 1. Get organization context
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

    const orgId = perfil.organization_id;

    // 2. Step One: UPSERT Athlete (table: atletas)
    const athletePayload = {
        organization_id: orgId,
        nombre_completo: formData.nombre_completo,
        documento: formData.documento,
        category_id: formData.category_id,
        updated_at: new Date().toISOString(),
        active: true,
    };

    let targetAtletaId = atletaId;

    if (targetAtletaId) {
        // Update existing athlete
        const { error: athleteError } = await supabase
            .from("atletas")
            .update(athletePayload)
            .eq("id", targetAtletaId);
            
        if (athleteError) {
            console.error("[saveAthleteAgreement] Athlete Update Error:", athleteError.message);
            return { error: `Error al actualizar datos básicos: ${athleteError.message}` };
        }
    } else {
        // Insert new athlete
        const { data: newAthlete, error: athleteError } = await supabase
            .from("atletas")
            .insert({
                ...athletePayload,
                created_at: new Date().toISOString(),
            })
            .select("id")
            .single();

        if (athleteError) {
            console.error("[saveAthleteAgreement] Athlete Insert Error:", athleteError.message);
            return { error: `Error al crear jugador: ${athleteError.message}` };
        }
        targetAtletaId = newAthlete.id;
    }

    // 3. Step Two: UPSERT Agreement (table: athlete_agreements)
    // Map all amounts — coerce to integer
    const agreementPayload = {
        organization_id: orgId,
        atleta_id: targetAtletaId,
        temporada: "2026",
        vigente_desde: new Date().toISOString().split("T")[0],
        costo_pase: Math.round(Number(formData.costo_pase) || 0),
        prima_inicial: Math.round(Number(formData.prima_inicial) || 0),
        viatico_practica: Math.round(Number(formData.viatico_practica) || 0),
        viatico_partido: Math.round(Number(formData.viatico_partido) || 0),
        premio_victoria: Math.round(Number(formData.premio_victoria) || 0),
        premio_empate: Math.round(Number(formData.premio_empate) || 0),
        premio_derrota: Math.round(Number(formData.premio_derrota) || 0),
        // Backward-compat column
        viatico_base: Math.round(Number(formData.viatico_partido) || 0),
        // Extra columns
        premio_fijo_resultado: Math.round(Number(formData.premio_fijo_resultado) || 0),
        premio_clasificacion: Math.round(Number(formData.premio_clasificacion) || 0),
        premio_campeonato: Math.round(Number(formData.premio_campeonato) || 0),
    };

    let agreementError;

    if (existingAgreementId) {
        // UPDATE existing agreement
        const result = await supabase
            .from("athlete_agreements")
            .update({
                ...agreementPayload,
                updated_at: new Date().toISOString(),
            })
            .eq("id", existingAgreementId);
        agreementError = result.error;
    } else {
        // INSERT new agreement
        const result = await supabase
            .from("athlete_agreements")
            .insert(agreementPayload);
        agreementError = result.error;
    }

    if (agreementError) {
        console.error("[saveAthleteAgreement] Agreement Error:", agreementError.message);
        return { error: `Atleta guardado, pero hubo un error en el acuerdo: ${agreementError.message}` };
    }

    // 4. Finalize
    revalidatePath("/atletas");
    return { error: null };
}

/**
 * Records a new financial movement for an athlete.
 * Returns { error: string | null }.
 */
export async function saveMovimiento(payload: {
    atleta_id: string;
    fecha: string;
    tipo: MovimientoTipo;
    concepto: string;
    monto: number;
}): Promise<{ error: string | null }> {
    "use server";

    const supabase = await createClient();

    // 1. Get current user & organization
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado" };

    const { data: perfil } = await supabase
        .from("perfiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

    if (!perfil?.organization_id) return { error: "Organización no encontrada" };

    // 2. Insert movement
    const { error } = await supabase
        .from("atleta_movimientos")
        .insert({
            organization_id: perfil.organization_id,
            atleta_id: payload.atleta_id,
            fecha: payload.fecha,
            tipo: payload.tipo,
            concepto: payload.concepto,
            monto: Math.round(Number(payload.monto) || 0),
        });

    if (error) {
        console.error("[saveMovimiento] Error:", error.message);
        return { error: error.message };
    }

    // 3. Revalidate the profile page
    revalidatePath(`/atletas/${payload.atleta_id}`);
    
    return { error: null };
}
