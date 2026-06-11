"use server";

import { createClient } from '@/lib/supabase/server';

export async function getResumenFinanciero(organizationId: string, mes: number, anio: number) {
    const supabase = await createClient();

    // Rango de fechas para el mes seleccionado
    const startDate = `${anio}-${String(mes).padStart(2, '0')}-01`;
    // Calcular fin de mes
    const endDate = new Date(anio, mes, 0).toISOString().split('T')[0];

    // 1. Ingresos y Egresos del mes (Confirmados, NO transferencias)
    const { data: transaccionesMes } = await supabase
        .from('transacciones')
        .select('monto, flow')
        .eq('organization_id', organizationId)
        .gte('fecha', startDate)
        .lte('fecha', endDate)
        .eq('status', 'confirmed')
        .eq('es_transferencia', false)
        .is('deleted_at', null);

    const ingresos_mes = transaccionesMes
        ?.filter(t => t.flow === 'income')
        .reduce((acc, curr) => acc + Number(curr.monto), 0) || 0;

    const egresos_mes = transaccionesMes
        ?.filter(t => t.flow === 'expense')
        .reduce((acc, curr) => acc + Number(curr.monto), 0) || 0;

    // 2. Saldo Acumulado (Global)
    // Viene de la suma de saldo_inicial de la tabla cuentas
    const { data: cuentas } = await supabase
        .from('cuentas')
        .select('saldo_inicial')
        .eq('organization_id', organizationId)
        .eq('activo', true)
        .is('deleted_at', null);

    const saldo_acumulado = cuentas
        ?.reduce((sum, c) => sum + Number(c.saldo_inicial), 0) || 0;

    // 3. Pendientes
    const { data: pendientes } = await supabase
        .from('transacciones')
        .select('monto')
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .is('deleted_at', null);

    const total_pendientes = pendientes?.reduce((acc, curr) => acc + Number(curr.monto), 0) || 0;
    const cantidad_pendientes = pendientes?.length || 0;

    return {
        ingresos_mes,
        egresos_mes,
        saldo_acumulado,
        total_pendientes,
        cantidad_pendientes
    };
}

export async function getResumenMensual(organizationId: string, ultimosMeses = 6) {
    const supabase = await createClient();

    // Calcular fecha de inicio (hace X meses)
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth() - ultimosMeses + 1, 1);
    const startDate = start.toISOString().split('T')[0];

    // Traer transacciones confirmadas desde esa fecha
    const { data } = await supabase
        .from('transacciones')
        .select('fecha, monto, flow')
        .eq('organization_id', organizationId)
        .gte('fecha', startDate)
        .eq('status', 'confirmed')
        .eq('es_transferencia', false)
        .is('deleted_at', null)
        .order('fecha', { ascending: true });

    // Agrupar por mes
    const map = new Map<string, { month: string, anio: number, ingresos: number, egresos: number, order: number }>();

    // Inicializar los últimos X meses con 0 para que el gráfico no tenga huecos
    for (let i = 0; i < ultimosMeses; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        // Formato ES abreviado: 'Ene', 'Feb'
        const mesName = d.toLocaleString('es-PY', { month: 'short' });
        const mesCap = mesName.charAt(0).toUpperCase() + mesName.slice(1);

        map.set(key, {
            month: mesCap,
            anio: d.getFullYear(),
            ingresos: 0,
            egresos: 0,
            order: d.getTime()
        });
    }

    if (data) {
        data.forEach(t => {
            const d = new Date(t.fecha + 'T12:00:00'); // Evitar problemas de timezone con fechas string
            const key = `${d.getFullYear()}-${d.getMonth()}`;

            if (map.has(key)) {
                const entry = map.get(key)!;
                if (t.flow === 'income') entry.ingresos += Number(t.monto);
                if (t.flow === 'expense') entry.egresos += Number(t.monto);
            }
        });
    }

    // Convertir a array y ordenar
    return Array.from(map.values()).sort((a, b) => a.order - b.order);
}

export async function getUltimasTransacciones(organizationId: string, limite = 8) {
    const supabase = await createClient();

    const { data } = await supabase
        .from('transacciones')
        .select(`
            id,
            fecha,
            flow,
            monto,
            status,
            descripcion,
            es_transferencia,
            comprobante_numero,
            transaction_types(nombre),
            categorias(nombre),
            entidades(nombre, tipo:tipo_entidad_id),
            atletas(nombre_completo)
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'confirmed')
        .eq('es_transferencia', false)
        .is('deleted_at', null)
        .order('fecha', { ascending: false })
        .limit(limite);

    return data || [];
}

export async function getSaldoInicialCuentas(organizationId: string): Promise<number> {
    const supabase = await createClient();
    const { data } = await supabase
        .from('cuentas')
        .select('saldo_inicial')
        .eq('organization_id', organizationId)
        .eq('activo', true)
        .is('deleted_at', null);
    return data?.reduce((sum, c) => sum + Number(c.saldo_inicial), 0) || 0;
}

export async function getSaldosPorCuenta(organizationId: string) {
    const supabase = await createClient();

    // 1. Obtener todas las cuentas activas
    const { data: cuentas } = await supabase
        .from('cuentas')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('activo', true)

        .is('deleted_at', null);

    if (!cuentas || cuentas.length === 0) return [];

    // 2. Calcular saldo por cuenta (SOLO Saldo Inicial por ahora)
    return cuentas.map(cuenta => {
        return {
            ...cuenta,
            saldo_calculado: Number(cuenta.saldo_inicial)
        };
    });
}

export async function getPresupuestosPorCategoria(organizationId: string, temporada: string) {
    const supabase = await createClient();

    // 1. Obtener presupuestos de la temporada
    const { data: presupuestos } = await supabase
        .from('presupuestos')
        .select(`
            *,
            categoria:categorias(nombre)
        `)
        .eq('organization_id', organizationId)
        .eq('temporada', temporada);

    if (!presupuestos) return [];

    // 2. Calcular gastado por categoría en esa temporada (año)
    // Asumimos temporada "2025" == año calendario 2025
    const start = `${temporada}-01-01`;
    const end = `${temporada}-12-31`;

    const { data: gastos } = await supabase
        .from('transacciones')
        .select('monto, category_id')
        .eq('organization_id', organizationId)
        .eq('flow', 'expense')
        .eq('status', 'confirmed')
        .eq('es_transferencia', false)
        .gte('fecha', start)
        .lte('fecha', end)
        .not('category_id', 'is', null);

    return presupuestos.map(p => {
        const gastado = gastos
            ?.filter(g => g.category_id === p.category_id)
            .reduce((acc, curr) => acc + Number(curr.monto), 0) || 0;

        return {
            ...p,
            nombre_categoria: p.categoria?.nombre || 'Categoría Desconocida',
            gastado,
            disponible: Number(p.monto_total) - gastado,
            porcentaje: (gastado / Number(p.monto_total)) * 100
        };
    });
}
