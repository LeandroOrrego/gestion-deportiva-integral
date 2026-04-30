
"use server";

import { createClient } from '@/lib/supabase/server';

export type TransactionFilter = {
    startDate?: string; // YYYY-MM-DD
    endDate?: string;   // YYYY-MM-DD
    month?: number;     // Keeping for backward compatibility if needed temporarily
    year?: number;
    flow?: 'income' | 'expense' | 'all';
    fondo?: 'deportivo' | 'administrativo' | 'all';
    search?: string;
    excludeCajaMovements?: boolean;
    cuenta_id?: string;
    evento_id?: string;
}

export async function getTransactions(organizationId: string, filters: TransactionFilter) {
    const supabase = await createClient();

    // Use specific range if provided, otherwise fallback to month/year
    let startDate = filters.startDate;
    let endDate = filters.endDate;

    if (!startDate || !endDate) {
        const year = filters.year || new Date().getFullYear();
        const month = filters.month || new Date().getMonth() + 1;
        startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        endDate = new Date(year, month, 0).toISOString().split('T')[0];
    }

    let query = supabase
        .from('transacciones')
        .select(`
            id,
            fecha,
            flow,
            monto,
            status,
            descripcion,
            fondo,
            comprobante_numero,
            es_transferencia,
            cuenta_id,
            entidad_id,
            transaction_type_id,
            category_id,
            transaction_types!inner (id, nombre),
            categorias (id, nombre),
            cuentas!cuenta_id (id, nombre, saldo_inicial, tipo),
            entidades (id, nombre)
        `)
        .eq('organization_id', organizationId)
        .gte('fecha', startDate)
        .lte('fecha', endDate)
        .is('deleted_at', null)
        .order('fecha', { ascending: false });

    if (filters.flow && filters.flow !== 'all') {
        query = query.eq('flow', filters.flow);
    }

    if (filters.fondo && filters.fondo !== 'all') {
        query = query.eq('fondo', filters.fondo);
    }

    if (filters.search) {
        query = query.ilike('descripcion', `%${filters.search}%`);
    }

    if (filters.cuenta_id && filters.cuenta_id !== 'all') {
        query = query.eq('cuenta_id', filters.cuenta_id);
    }

    if (filters.excludeCajaMovements) {
        query = query.neq('transaction_types.nombre', 'Movimiento/Caja');
    }

    if (filters.evento_id && filters.evento_id !== 'all') {
        query = query.eq('evento_id', filters.evento_id);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching transactions (full query):', error);
        // Fallback: try minimal query
        let fallbackQuery = supabase
            .from('transacciones')
            .select('*')
            .eq('organization_id', organizationId)
            .gte('fecha', startDate)
            .lte('fecha', endDate)
            .is('deleted_at', null)
            .order('fecha', { ascending: false });

        const { data: fallbackData, error: fallbackError } = await fallbackQuery;
        if (fallbackError) return [];
        return fallbackData || [];
    }

    return data || [];
}

export async function getTransactionFormData(organizationId: string) {
    const supabase = await createClient();

    const [
        { data: types },
        { data: categories },
        { data: accounts },
        { data: entities },
        { data: eventos }
    ] = await Promise.all([
        supabase
            .from('transaction_types')
            .select('id, nombre, flow')
            .or(`organization_id.eq.${organizationId},organization_id.is.null`)
            .is('deleted_at', null)
            .order('nombre'),
        supabase.from('categorias').select('id, nombre').eq('organization_id', organizationId),
        supabase.from('cuentas').select('id, nombre, saldo_inicial, activo').eq('organization_id', organizationId).eq('activo', true),
        supabase.from('entidades').select('id, nombre, tipo_entidad_id').eq('organization_id', organizationId),
        supabase.from('eventos').select('id, fecha, rival, tipo, categorias(nombre)').eq('organization_id', organizationId).order('fecha', { ascending: false }).limit(20)
    ]);

    return {
        types: types || [],
        categories: categories || [],
        accounts: accounts || [],
        entities: entities || [],
        eventos: eventos || []
    };
}

export async function createTransaction(data: any) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('transacciones')
        .insert({
            ...data,
            status: 'confirmed',
            created_at: new Date().toISOString()
        });

    if (error) throw error;

    // Update the account balance (saldo_inicial) after creating the transaction
    if (data.cuenta_id) {
        const monto = Number(data.monto);
        const adjustment = data.flow === 'income' ? monto : -monto;

        // Get current balance
        const { data: account } = await supabase
            .from('cuentas')
            .select('saldo_inicial')
            .eq('id', data.cuenta_id)
            .single();

        if (account) {
            const newBalance = Number(account.saldo_inicial) + adjustment;
            await supabase
                .from('cuentas')
                .update({ saldo_inicial: newBalance })
                .eq('id', data.cuenta_id);
        }
    }

    return true;
}

export async function updateTransaction(id: string, data: any) {
    const supabase = await createClient();

    // 1. Get original transaction for balance reversal
    const { data: original } = await supabase
        .from('transacciones')
        .select('monto, flow, cuenta_id, status')
        .eq('id', id)
        .single();

    // 2. Clean data to only keep valid database columns
    const validColumns = [
        'fecha', 'flow', 'monto', 'descripcion', 'fondo', 
        'comprobante_numero', 'cuenta_id', 'entidad_id', 
        'transaction_type_id', 'category_id', 'atleta_id', 'evento_id', 'cantidad'
    ];
    
    const updateData: any = {};
    validColumns.forEach(col => {
        if (data[col] !== undefined) {
            updateData[col] = data[col];
        }
    });

    // Handle nullifications from UI
    if (updateData.category_id === "none" || updateData.category_id === "") updateData.category_id = null;
    if (updateData.entidad_id === "none" || updateData.entidad_id === "") updateData.entidad_id = null;
    if (updateData.evento_id === "none" || updateData.evento_id === "") updateData.evento_id = null;
    if (updateData.cantidad === "") updateData.cantidad = null;

    const { error } = await supabase
        .from('transacciones')
        .update({
            ...updateData,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) throw error;

    // 3. Balance Adjustment Logic
    if (original && original.status === 'confirmed') {
        const montoOld = Number(original.monto);
        const montoNew = updateData.monto !== undefined ? Number(updateData.monto) : montoOld;
        const flowOld = original.flow;
        const flowNew = updateData.flow !== undefined ? updateData.flow : flowOld;
        const accountIdOld = original.cuenta_id;
        const accountIdNew = updateData.cuenta_id !== undefined ? updateData.cuenta_id : accountIdOld;

        const hasChanges = montoOld !== montoNew || flowOld !== flowNew || accountIdOld !== accountIdNew;

        if (hasChanges) {
            // Reverse old impact
            const reversal = flowOld === 'income' ? -montoOld : montoOld;
            const { data: accOld } = await supabase.from('cuentas').select('saldo_inicial').eq('id', accountIdOld).single();
            if (accOld) {
                await supabase.from('cuentas').update({ saldo_inicial: Number(accOld.saldo_inicial) + reversal }).eq('id', accountIdOld);
            }

            // Apply new impact
            const addition = flowNew === 'income' ? montoNew : -montoNew;
            const { data: accNew } = await supabase.from('cuentas').select('saldo_inicial').eq('id', accountIdNew).single();
            if (accNew) {
                await supabase.from('cuentas').update({ saldo_inicial: Number(accNew.saldo_inicial) + addition }).eq('id', accountIdNew);
            }
        }
    }

    return true;
}

export async function voidTransaction(id: string) {
    const supabase = await createClient();

    // Get the transaction details first to reverse the balance
    const { data: transaction } = await supabase
        .from('transacciones')
        .select('monto, flow, cuenta_id, status')
        .eq('id', id)
        .single();

    const { error } = await supabase
        .from('transacciones')
        .update({
            status: 'voided',
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) throw error;

    // Reverse the balance adjustment if the transaction was confirmed
    if (transaction && transaction.status === 'confirmed' && transaction.cuenta_id) {
        const monto = Number(transaction.monto);
        // Reverse: if it was income, subtract it back; if expense, add it back
        const reversal = transaction.flow === 'income' ? -monto : monto;

        const { data: account } = await supabase
            .from('cuentas')
            .select('saldo_inicial')
            .eq('id', transaction.cuenta_id)
            .single();

        if (account) {
            const newBalance = Number(account.saldo_inicial) + reversal;
            await supabase
                .from('cuentas')
                .update({ saldo_inicial: newBalance })
                .eq('id', transaction.cuenta_id);
        }
    }

    return true;
}

export async function getTransactionStats(organizationId: string, filters: TransactionFilter) {
    const supabase = await createClient();

    let startDate = filters.startDate;
    let endDate = filters.endDate;

    if (!startDate || !endDate) {
        const year = filters.year || new Date().getFullYear();
        const month = filters.month || new Date().getMonth() + 1;
        startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        endDate = new Date(year, month, 0).toISOString().split('T')[0];
    }

    let query = supabase
        .from('transacciones')
        .select('monto, flow, transaction_types!inner(nombre)')
        .eq('organization_id', organizationId)
        .gte('fecha', startDate)
        .lte('fecha', endDate)
        .eq('status', 'confirmed')
        .is('deleted_at', null);

    if (filters.fondo && filters.fondo !== 'all') {
        query = query.eq('fondo', filters.fondo);
    }

    if (filters.flow && filters.flow !== 'all') {
        query = query.eq('flow', filters.flow);
    }

    if (filters.excludeCajaMovements) {
        query = query.neq('transaction_types.nombre', 'Movimiento/Caja');
    }

    if (filters.evento_id && filters.evento_id !== 'all') {
        query = query.eq('evento_id', filters.evento_id);
    }

    const { data } = await query;

    const income = data?.filter(t => t.flow === 'income').reduce((acc, curr) => acc + Number(curr.monto), 0) || 0;
    const expense = data?.filter(t => t.flow === 'expense').reduce((acc, curr) => acc + Number(curr.monto), 0) || 0;

    return {
        income,
        expense,
        balance: income - expense
    };
}

export async function getTotalAccountBalance(organizationId: string) {
    const supabase = await createClient();

    // Get all active, non-deleted accounts — saldo_inicial is kept up-to-date by DB triggers
    const { data: accounts } = await supabase
        .from('cuentas')
        .select('saldo_inicial')
        .eq('organization_id', organizationId)
        .eq('activo', true)
        .is('deleted_at', null);

    const saldoGeneral = accounts?.reduce((sum, c) => sum + Number(c.saldo_inicial), 0) || 0;

    return saldoGeneral;
}
