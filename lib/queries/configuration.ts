
"use server";

import { createClient } from '@/lib/supabase/server';

export async function getTransactionTypes() {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('transaction_types')
        .select('*')
        .is('deleted_at', null)
        .order('nombre');

    if (error) {
        console.error('Error fetching transaction types:', error);
        return [];
    }

    return data || [];
}

export async function createTransactionType(payload: {
    nombre: string;
    flow: 'income' | 'expense';
    area?: string;
}) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('transaction_types')
        .insert({
            nombre: payload.nombre,
            flow: payload.flow,
            area: payload.area || null,
            organization_id: null,
        });

    if (error) throw error;
    return true;
}

export async function updateTransactionType(id: string, payload: {
    nombre: string;
    area?: string;
}) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('transaction_types')
        .update({
            nombre: payload.nombre,
            area: payload.area || null,
        })
        .eq('id', id);

    if (error) throw error;
    return true;
}

export async function softDeleteTransactionType(id: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('transaction_types')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

    if (error) throw error;
    return true;
}

export async function restoreTransactionType(id: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('transaction_types')
        .update({ deleted_at: null })
        .eq('id', id);

    if (error) throw error;
    return true;
}
