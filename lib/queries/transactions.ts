
"use server";

import { createClient } from '@/lib/supabase/server';

export type TransactionFilter = {
    startDate?: string;
    endDate?: string;
    month?: number;
    year?: number;
    flow?: 'income' | 'expense' | 'all';
    fondo?: 'deportivo' | 'administrativo' | 'all';
    search?: string;
    excludeCajaMovements?: boolean;
    cuenta_id?: string;
    evento_id?: string;
    temporada?: string;
    entidad_id?: string;
}

export async function getTransactions(organizationId: string, filters: TransactionFilter) {
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
            transaction_types (id, nombre),
            categorias (id, nombre),
            cuentas!cuenta_id (id, nombre, saldo_inicial, tipo),
            entidades (id, nombre)
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'confirmed')
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

    if (filters.entidad_id && filters.entidad_id !== 'all') {
        query = query.eq('entidad_id', filters.entidad_id);
    }

    if (filters.excludeCajaMovements) {
        query = query.neq('transaction_types.nombre', 'Movimiento/Caja');
    }

    if (filters.evento_id && filters.evento_id !== 'all') {
        query = query.eq('evento_id', filters.evento_id);
    }

    if (filters.temporada && filters.temporada !== 'todas') {
        query = query.eq('temporada', filters.temporada);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching transactions (full query):', error);
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
            .eq('active', true)
            .is('deleted_at', null)
            .order('nombre'),
        supabase.from('categorias').select('id, nombre').eq('organization_id', organizationId),
        supabase.from('cuentas').select('id, nombre, saldo_inicial, activo').eq('organization_id', organizationId).eq('activo', true),
        supabase.from('entidades').select('id, nombre, tipo_entidad_id').eq('organization_id', organizationId),
        supabase.from('eventos').select('id, fecha, rival, tipo, jornada, categorias(nombre)').eq('organization_id', organizationId).order('fecha', { ascending: false }).limit(20)
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

    const fechaVencimientoFinal = (data.fecha_vencimiento && data.fecha_vencimiento.trim() !== "") 
      ? data.fecha_vencimiento 
      : null;

    // Extraemos is_credit para no enviarlo directo a la BD (si no existe la columna)
    const { is_credit, ...insertData } = data;
    const initialStatus = is_credit ? 'pending' : 'confirmed';

    const { error } = await supabase
        .from('transacciones')
        .insert({
            ...insertData,
            fecha_vencimiento: fechaVencimientoFinal,
            status: initialStatus,
            created_at: new Date().toISOString()
        });

    if (error) throw error;

    if (insertData.cuenta_id && !is_credit) {
        const monto = Number(insertData.monto);
        const adjustment = insertData.flow === 'income' ? monto : -monto;

        const { data: account } = await supabase
            .from('cuentas')
            .select('saldo_inicial')
            .eq('id', insertData.cuenta_id)
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

    const { data: original } = await supabase
        .from('transacciones')
        .select('monto, flow, cuenta_id, status')
        .eq('id', id)
        .single();

    const validColumns = [
        'fecha', 'flow', 'monto', 'descripcion', 'fondo',
        'comprobante_numero', 'cuenta_id', 'entidad_id',
        'transaction_type_id', 'category_id', 'atleta_id', 'evento_id', 'cantidad', 'fecha_vencimiento'
    ];

    const updateData: any = {};
    validColumns.forEach(col => {
        if (data[col] !== undefined) {
            updateData[col] = data[col];
        }
    });

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

    if (original && original.status === 'confirmed') {
        const montoOld = Number(original.monto);
        const montoNew = updateData.monto !== undefined ? Number(updateData.monto) : montoOld;
        const flowOld = original.flow;
        const flowNew = updateData.flow !== undefined ? updateData.flow : flowOld;
        const accountIdOld = original.cuenta_id;
        const accountIdNew = updateData.cuenta_id !== undefined ? updateData.cuenta_id : accountIdOld;

        const hasChanges = montoOld !== montoNew || flowOld !== flowNew || accountIdOld !== accountIdNew;

        if (hasChanges) {
            const reversal = flowOld === 'income' ? -montoOld : montoOld;
            const { data: accOld } = await supabase.from('cuentas').select('saldo_inicial').eq('id', accountIdOld).single();
            if (accOld) {
                await supabase.from('cuentas').update({ saldo_inicial: Number(accOld.saldo_inicial) + reversal }).eq('id', accountIdOld);
            }

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

    if (transaction && transaction.status === 'confirmed' && transaction.cuenta_id) {
        const monto = Number(transaction.monto);
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

export async function marcarComoPagado(id: string, cuenta_id: string, fecha_pago: string) {
    const supabase = await createClient();

    const { data: original, error: fetchError } = await supabase
        .from('transacciones')
        .select('monto, flow, status')
        .eq('id', id)
        .single();
        
    if (fetchError || !original) throw new Error("Transacción no encontrada");
    if (original.status === 'confirmed') throw new Error("La transacción ya está pagada");

    const { error: updateError } = await supabase
        .from('transacciones')
        .update({
            status: 'confirmed',
            cuenta_id: cuenta_id,
            fecha_pago: fecha_pago,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (updateError) throw updateError;

    const monto = Number(original.monto);
    const adjustment = original.flow === 'income' ? monto : -monto;

    const { data: account } = await supabase
        .from('cuentas')
        .select('saldo_inicial')
        .eq('id', cuenta_id)
        .single();

    if (account) {
        const newBalance = Number(account.saldo_inicial) + adjustment;
        await supabase
            .from('cuentas')
            .update({ saldo_inicial: newBalance })
            .eq('id', cuenta_id);
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

    const EXCLUDED_TYPE_NAMES = ['Movimiento/Caja', 'Transferencias'];

    let query = supabase
        .from('transacciones')
        .select('monto, flow, es_transferencia, transaction_types(nombre)')
        .eq('organization_id', organizationId)
        .gte('fecha', startDate)
        .lte('fecha', endDate)
        .eq('status', 'confirmed')
        .eq('es_transferencia', false)
        .is('deleted_at', null);

    if (filters.fondo && filters.fondo !== 'all') {
        query = query.eq('fondo', filters.fondo);
    }

    if (filters.flow && filters.flow !== 'all') {
        query = query.eq('flow', filters.flow);
    }

    if (filters.evento_id && filters.evento_id !== 'all') {
        query = query.eq('evento_id', filters.evento_id);
    }

    if (filters.temporada && filters.temporada !== 'todas') {
        query = query.eq('temporada', filters.temporada);
    }

    const { data } = await query;

    const valid = (data || []).filter((t: any) => !EXCLUDED_TYPE_NAMES.includes(t.transaction_types?.nombre));
    const income = valid.filter((t: any) => t.flow === 'income').reduce((acc: number, curr: any) => acc + Number(curr.monto), 0);
    const expense = valid.filter((t: any) => t.flow === 'expense').reduce((acc: number, curr: any) => acc + Number(curr.monto), 0);

    return {
        income,
        expense,
        balance: income - expense
    };
}

export async function getTotalAccountBalance(organizationId: string) {
    const supabase = await createClient();

    const { data: accounts } = await supabase
        .from('cuentas')
        .select('saldo_inicial')
        .eq('organization_id', organizationId)
        .eq('activo', true)
        .is('deleted_at', null);

    const saldoGeneral = accounts?.reduce((sum, c) => sum + Number(c.saldo_inicial), 0) || 0;

    return saldoGeneral;
}

export async function createTransferencia(data: {
    organization_id: string;
    cuenta_origen_id: string;
    cuenta_destino_id: string;
    monto: number;
    fecha: string;
    descripcion?: string;
    entidad_id?: string | null;
    comprobante_numero?: string | null;
    category_id?: string | null;
}): Promise<{ error: string | null }> {
    const supabase = await createClient();

    const monto = Math.round(Number(data.monto));
    if (monto <= 0) return { error: "El monto debe ser mayor a cero." };
    if (data.cuenta_origen_id === data.cuenta_destino_id) return { error: "Las cuentas deben ser diferentes." };

    const { data: tipo } = await supabase
        .from('transaction_types')
        .select('id')
        .eq('nombre', 'Movimiento/Caja')
        .single();

    const transaction_type_id = tipo?.id ?? null;
    const descripcion = data.descripcion || "Transferencia entre cuentas";
    const now = new Date().toISOString();

    // 1. Egreso en cuenta origen
    const { error: errorEgreso } = await supabase
        .from('transacciones')
        .insert({
            organization_id: data.organization_id,
            fecha: data.fecha,
            flow: 'expense',
            monto,
            fondo: 'administrativo',
            descripcion,
            cuenta_id: data.cuenta_origen_id,
            transaction_type_id,
            entidad_id: data.entidad_id ?? null,
            comprobante_numero: data.comprobante_numero ?? null,
            category_id: data.category_id ?? null,
            es_transferencia: true,
            status: 'confirmed',
            created_at: now,
        });

    if (errorEgreso) {
        console.error('[createTransferencia] Error egreso:', errorEgreso.message);
        return { error: `Error al registrar egreso: ${errorEgreso.message}` };
    }

    // 2. Ingreso en cuenta destino
    const { error: errorIngreso } = await supabase
        .from('transacciones')
        .insert({
            organization_id: data.organization_id,
            fecha: data.fecha,
            flow: 'income',
            monto,
            fondo: 'administrativo',
            descripcion,
            cuenta_id: data.cuenta_destino_id,
            transaction_type_id,
            entidad_id: data.entidad_id ?? null,
            comprobante_numero: data.comprobante_numero ?? null,
            category_id: data.category_id ?? null,
            es_transferencia: true,
            status: 'confirmed',
            created_at: now,
        });

    if (errorIngreso) {
        console.error('[createTransferencia] Error ingreso:', errorIngreso.message);
        return { error: `Error al registrar ingreso: ${errorIngreso.message}` };
    }

    // 3. Actualizar saldo cuenta origen (restar)
    const { data: cuentaOrigen } = await supabase
        .from('cuentas')
        .select('saldo_inicial')
        .eq('id', data.cuenta_origen_id)
        .single();

    if (cuentaOrigen) {
        await supabase
            .from('cuentas')
            .update({ saldo_inicial: Number(cuentaOrigen.saldo_inicial) - monto })
            .eq('id', data.cuenta_origen_id);
    }

    // 4. Actualizar saldo cuenta destino (sumar)
    const { data: cuentaDestino } = await supabase
        .from('cuentas')
        .select('saldo_inicial')
        .eq('id', data.cuenta_destino_id)
        .single();

    if (cuentaDestino) {
        await supabase
            .from('cuentas')
            .update({ saldo_inicial: Number(cuentaDestino.saldo_inicial) + monto })
            .eq('id', data.cuenta_destino_id);
    }

    return { error: null };
}

export async function getPendingExpenses(organizationId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('transacciones')
        .select(`
            id,
            fecha,
            flow,
            monto,
            status,
            descripcion,
            fecha_vencimiento,
            entidades (id, nombre)
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .eq('flow', 'expense')
        .is('deleted_at', null)
        .order('fecha_vencimiento', { ascending: true });

    if (error) {
        console.error('Error fetching pending expenses:', error);
        return [];
    }

    return data || [];
}

export async function getSaldoPrestamos(organizationId: string) {
    const supabase = await createClient();

    // 1. Identificar IDs de los tipos de préstamo
    const { data: prestamoTypes } = await supabase
        .from('transaction_types')
        .select('id')
        .in('nombre', ['Préstamo Financiero'])
        .eq('active', true)
        .is('deleted_at', null);

    const typeIds = prestamoTypes?.map(pt => pt.id) || [];
    if (typeIds.length === 0) return [];

    // 2. Traer transacciones confirmadas de esos tipos
    const { data: transacciones } = await supabase
        .from('transacciones')
        .select(`
            monto,
            flow,
            entidades (id, nombre)
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'confirmed') // Préstamos reales, no pendientes
        .in('transaction_type_id', typeIds)
        .is('deleted_at', null);

    if (!transacciones) return [];

    // 3. Agrupar por entidad y calcular saldo
    const agrupado = new Map<string, any>();

    transacciones.forEach(t => {
        const entidad = t.entidades as any;
        if (!entidad) return;
        
        const entidadId = entidad.id;
        const entidadNombre = entidad.nombre;

        if (!agrupado.has(entidadId)) {
            agrupado.set(entidadId, {
                id: entidadId,
                nombre: entidadNombre, // Este es el campo que se usa en la tabla
                total_recibido: 0,
                total_devuelto: 0,
                saldo_neto: 0
            });
        }

        const stats = agrupado.get(entidadId);

        // Ingreso = préstamo recibido (el club recibe la plata), Egreso = cuota/devolución pagada por el club
        if (t.flow === 'income') {
            stats.total_recibido += Number(t.monto);
        } else if (t.flow === 'expense') {
            stats.total_devuelto += Number(t.monto);
        }

        stats.saldo_neto = stats.total_recibido - stats.total_devuelto;
    });

    return Array.from(agrupado.values());
}