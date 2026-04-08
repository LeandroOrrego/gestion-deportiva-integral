
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabase = await createClient();

    // Fetch the first organization to use as context
    const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
    const organizationId = orgs?.[0]?.id;

    if (!organizationId) {
        return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    console.log('--- DEBUG START ---');
    console.log('Organization ID:', organizationId);

    const { data } = await supabase
        .from('transacciones')
        .select('flow, monto')
        .eq('organization_id', organizationId)
        .eq('status', 'confirmed');

    const totalRegistros = data?.length || 0;
    const ingresos = data?.filter(t => t.flow === 'income').reduce((s, t) => s + Number(t.monto), 0) || 0;
    const egresos = data?.filter(t => t.flow === 'expense').reduce((s, t) => s + Number(t.monto), 0) || 0;
    const saldo = ingresos - egresos;

    console.log('Total registros:', totalRegistros);
    console.log('Ingresos:', ingresos);
    console.log('Egresos:', egresos);
    console.log('Saldo:', saldo);
    console.log('--- DEBUG END ---');

    return NextResponse.json({
        totalRegistros,
        ingresos,
        egresos,
        saldo
    });
}
