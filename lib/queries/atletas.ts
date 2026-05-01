"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createTransaction } from "./transactions";
import { todayLocal } from "@/lib/utils/date";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AtletaConAcuerdo = {
    id: string;
    nombre_completo: string;
    documento: string | null;
    telefono: string | null;
    posicion: string | null;
    status: string;
    category_id: string | null;
    entidad_id: string | null;
    categorias: { id: string; nombre: string } | null;
    banco: string | null;
    tipo_cuenta: string | null;
    numero_cuenta: string | null;
    alias: string | null;
    titular_cuenta: string | null;
    documento_titular: string | null;
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
    documento?: string;
    telefono?: string;
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

    // Bank Data
    banco?: string;
    tipo_cuenta?: string;
    numero_cuenta?: string;
    alias?: string;
    titular_cuenta?: string;
    documento_titular?: string;
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

export type AtletaMovimiento = {
    id: string;
    atleta_id: string;
    fecha: string;
    tipo: "DEBE" | "HABER";
    concepto: string;
    monto: number;
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
            telefono,
            posicion,
            status,
            category_id,
            entidad_id,
            banco,
            tipo_cuenta,
            numero_cuenta,
            alias,
            titular_cuenta,
            documento_titular,
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
            telefono: row.telefono ?? null,
            posicion: row.posicion ?? null,
            status: row.status ?? "active",
            category_id: row.category_id ?? null,
            entidad_id: row.entidad_id ?? null,
            categorias: row.categorias ?? null,
            banco: row.banco ?? null,
            tipo_cuenta: row.tipo_cuenta ?? null,
            numero_cuenta: row.numero_cuenta ?? null,
            alias: row.alias ?? null,
            titular_cuenta: row.titular_cuenta ?? null,
            documento_titular: row.documento_titular ?? null,
            acuerdo_2026: acuerdo2026,
        };
    });

    return athletes;
}

/**
 * Fetches basic profile info for a single athlete along with their 2026 agreement.
 */
export async function getAthleteProfile(id: string): Promise<AtletaConAcuerdo | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("atletas")
        .select(`
            id,
            nombre_completo,
            documento,
            telefono,
            posicion,
            status,
            category_id,
            entidad_id,
            banco,
            tipo_cuenta,
            numero_cuenta,
            alias,
            titular_cuenta,
            documento_titular,
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
                es_premio_fijo,
                premio_fijo_resultado,
                premio_clasificacion,
                premio_campeonato,
                vigente_desde,
                vigente_hasta
            )
        `)
        .eq("id", id)
        .single();

    if (error) {
        console.error("[getAthleteProfile] Error:", error.message);
        return null;
    }

    const agreements: any[] = Array.isArray(data.athlete_agreements)
        ? data.athlete_agreements
        : data.athlete_agreements
            ? [data.athlete_agreements]
            : [];

    const acuerdo2026 = agreements.find((a) => a.temporada === "2026") ?? null;

    return {
        ...data,
        acuerdo_2026: acuerdo2026,
    } as unknown as AtletaConAcuerdo;
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
        documento: formData.documento?.trim() || null,
        telefono: formData.telefono?.trim() || null,
        category_id: formData.category_id,
        banco: formData.banco || null,
        tipo_cuenta: formData.tipo_cuenta || null,
        numero_cuenta: formData.numero_cuenta || null,
        alias: formData.alias || null,
        titular_cuenta: formData.titular_cuenta || null,
        documento_titular: formData.documento_titular || null,
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
        vigente_desde: todayLocal(),
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
 * When tipo === "DEBE" (real payment), also registers an EGRESO
 * in the central transacciones table to impact club accounting.
 */
export async function saveMovimiento(payload: {
    atleta_id: string;
    fecha: string;
    tipo: MovimientoTipo;
    concepto: string;
    monto: number;
    cuenta_id?: string;
    transaction_type_id?: string;
    entidad_id?: string;
    evento_id?: string;
    comprobante_numero?: string;
    category_id?: string | null;
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

    const orgId = perfil.organization_id;
    const montoFinal = Math.round(Number(payload.monto) || 0);

    // 2. Build the athlete movement insert
    const movimientoInsert = supabase
        .from("atleta_movimientos")
        .insert({
            organization_id: orgId,
            atleta_id: payload.atleta_id,
            fecha: payload.fecha,
            tipo: payload.tipo,
            concepto: payload.concepto,
            monto: montoFinal,
        });

    // 3. If DEBE (pago real), also insert EGRESO in transacciones
    if (payload.tipo === "DEBE") {
        if (!payload.cuenta_id || !payload.transaction_type_id) {
            return { error: "Debe proveer una cuenta y una categoría financiera para pagos." };
        }

        // Normalize optional fields
        const eventoId = payload.evento_id && payload.evento_id !== "none" ? payload.evento_id : null;
        const categoryId = payload.category_id || null;

        try {
            // Ejecutar ambas inserciones en paralelo
            const [movResult, txResult] = await Promise.all([
                movimientoInsert,
                createTransaction({
                    organization_id: orgId,
                    fecha: payload.fecha,
                    flow: "expense",
                    fondo: "deportivo",
                    monto: montoFinal,
                    transaction_type_id: payload.transaction_type_id,
                    cuenta_id: payload.cuenta_id,
                    descripcion: `Pago Atleta - ${payload.concepto}`,
                    atleta_id: payload.atleta_id,
                    entidad_id: payload.entidad_id || null,
                    evento_id: eventoId,
                    comprobante_numero: payload.comprobante_numero || null,
                    category_id: categoryId,
                })
            ]);

            if (movResult.error) {
                console.error("[saveMovimiento] Movimiento Error:", movResult.error.message);
                return { error: `Error en movimiento: ${movResult.error.message}` };
            }

            console.log(`[saveMovimiento] ✅ DEBE registrado: movimiento + EGRESO en transacciones (${montoFinal} Gs.)`);
        } catch (error: any) {
            console.error("[saveMovimiento] Transacción Error:", error.message);
            return { error: `Movimiento y transacción fallaron: ${error.message}` };
        }
    } else {
        // HABER: solo insertar movimiento del atleta
        const { error } = await movimientoInsert;

        if (error) {
            console.error("[saveMovimiento] Error:", error.message);
            return { error: error.message };
        }

        console.log(`[saveMovimiento] ✅ HABER registrado en atleta_movimientos (${montoFinal} Gs.)`);
    }

    // 4. Revalidate the profile page
    revalidatePath(`/atletas/${payload.atleta_id}`);

    return { error: null };
}

/**
 * Deletes a financial movement from an athlete's current account.
 * Note: If the movement was a DEBE (linked to a transaction), this only 
 * deletes the athlete current account tracking portion.
 */
export async function deleteMovimiento(id: string, atletaId: string): Promise<{ error: string | null }> {
    "use server";

    const supabase = await createClient();

    const { error } = await supabase
        .from("atleta_movimientos")
        .delete()
        .eq("id", id);
        
    if (error) {
        console.error("[deleteMovimiento] Error:", error.message);
        return { error: error.message };
    }

    revalidatePath(`/atletas/${atletaId}`);
    return { error: null };
}

/**
 * Soft-deletes an athlete by setting deleted_at and active = false.
 * The athlete will be hidden from all active queries.
 */
export async function softDeleteAthlete(id: string): Promise<{ error: string | null }> {
    "use server";

    const supabase = await createClient();

    const { error } = await supabase
        .from("atletas")
        .update({
            deleted_at: new Date().toISOString(),
            active: false,
        })
        .eq("id", id);

    if (error) {
        console.error("[softDeleteAthlete] Error:", error.message);
        return { error: error.message };
    }

    revalidatePath("/atletas");
    return { error: null };
}
export async function getCategories() {
    const supabase = await createClient(); // Asumiendo que createClient ya está importado arriba
    const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('nombre');

    if (error) {
        console.error("Error obteniendo categorias:", error);
        return [];
    }
    return data;
}