
"use server";

import { createClient } from '@/lib/supabase/server';

// --- Tipos de Entidad ---

export async function getTiposEntidad() {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('tipo_entidades')
        .select('*')
        .is('deleted_at', null)
        .order('nombre');

    if (error) {
        console.error('Error fetching entity types:', error);
        return [];
    }

    return data || [];
}

export async function createTipoEntidad(payload: {
    nombre: string;
    icono?: string;
    organization_id?: string;
}) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('tipo_entidades')
        .insert({
            nombre: payload.nombre,
            icono: payload.icono || 'User',
            organization_id: payload.organization_id || null, // Algunos pueden ser globales
            activo: true, // Según screenshot es 'activo'
        });

    if (error) throw error;
    return true;
}

export async function updateTipoEntidad(id: string, payload: {
    nombre: string;
    icono?: string;
}) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('tipo_entidades')
        .update({
            nombre: payload.nombre,
            icono: payload.icono,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) throw error;
    return true;
}

// --- Entidades (Directorio) ---

export async function getEntidades(organizationId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('entidades')
        .select(`
            *,
            tipo_entidades (
                id,
                nombre,
                icono
            )
        `)
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .order('nombre');

    if (error) {
        console.error('Error fetching entities:', error);
        return [];
    }

    return data || [];
}

export async function createEntidad(payload: {
    organization_id: string;
    tipo_entidad_id: string;
    nombre: string;
    ruc?: string;
    telefono?: string;
    email?: string;
}) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('entidades')
        .insert({
            ...payload,
            created_at: new Date().toISOString()
        });

    if (error) throw error;
    return true;
}

export async function updateEntidad(id: string, payload: {
    tipo_entidad_id?: string;
    nombre?: string;
    ruc?: string;
    telefono?: string;
    email?: string;
}) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('entidades')
        .update({
            ...payload,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) throw error;
    return true;
}

export async function deleteEntidad(id: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('entidades')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

    if (error) throw error;
    return true;
}
