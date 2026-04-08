
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking schema for table: transacciones');

    const { data: columns, error: colError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'transacciones')
        .eq('table_schema', 'public');

    if (colError) {
        console.error('Error fetching columns directly:', colError);
    } else {
        console.log('Columns:', JSON.stringify(columns, null, 2));
    }
}

async function testInsert() {
    console.log('Attempting debug insert...');

    // Get a valid organization
    const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
    const orgId = orgs?.[0]?.id;

    // Get a valid transaction type (ensure it matches flow)
    const { data: types } = await supabase.from('transaction_types').select('id, flow').limit(1);
    const type = types?.[0];

    if (!orgId || !type) {
        console.log('Cannot run test insert: missing org or type');
        return;
    }

    const payload = {
        organization_id: orgId,
        monto: 1000,
        fecha: new Date().toISOString(),
        flow: type.flow, // Use the flow from the type to avoid mismatch
        transaction_type_id: type.id,
        status: 'confirmed',
        // fondo: 'Deportivo' // Test with and without this
    };

    console.log('Insert WITHOUT fondo:');
    const { error: err1 } = await supabase.from('transacciones').insert(payload);
    if (err1) console.log('Result 1 (Error):', JSON.stringify(err1, null, 2));
    else console.log('Result 1 (Success)');

    const payload2 = { ...payload, fondo: 'Deportivo' };
    console.log('Insert WITH fondo=Deportivo:');
    const { error: err2 } = await supabase.from('transacciones').insert(payload2);
    if (err2) console.log('Result 2 (Error):', JSON.stringify(err2, null, 2));
    else console.log('Result 2 (Success)');

    const payload3 = { ...payload, fondo: 'sport' };
    console.log('Insert WITH fondo=sport:');
    const { error: err3 } = await supabase.from('transacciones').insert(payload3);
    if (err3) console.log('Result 3 (Error):', JSON.stringify(err3, null, 2));
    else console.log('Result 3 (Success)');
}

async function run() {
    await checkSchema();
    await testInsert();
}

run();
