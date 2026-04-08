
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
const { createClient } = require('@supabase/supabase-js');

async function main() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing env vars. URL:', !!supabaseUrl, 'Key:', !!supabaseKey);
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get org
    const { data: orgs, error: orgError } = await supabase.from('organizations').select('id').limit(1);
    if (orgError) { console.error('Error fetching org:', orgError); return; }

    const organizationId = orgs[0]?.id;
    console.log('Organization ID:', organizationId);

    // Run query
    const { data, error } = await supabase
        .from('transacciones')
        .select('flow, monto')
        .eq('organization_id', organizationId)
        .eq('status', 'confirmed'); // Removed .is('deleted_at', null) based on user instruction? 
    // Wait, the user said: "El saldo_acumulado debe calcularse con esta query... WHERE organization_id... AND status = 'confirmed'".
    // The user implied that this query returns 21M.

    if (error) { console.error('Error fetching transactions:', error); return; }

    console.log('Total registros:', data.length);
    const ingresos = data.filter(t => t.flow === 'income').reduce((s, t) => s + Number(t.monto), 0);
    const egresos = data.filter(t => t.flow === 'expense').reduce((s, t) => s + Number(t.monto), 0);

    console.log('Ingresos:', ingresos);
    console.log('Egresos:', egresos);
    console.log('Saldo:', ingresos - egresos);
}

main();
