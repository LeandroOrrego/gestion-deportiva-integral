const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase
        .from('transaction_types')
        .select('id, nombre, flow, active')
        .order('nombre');

    if (error) {
        console.error('Error selecting types:', error.message);
        return;
    }

    const { data: categorias, error: catError } = await supabase
        .from('categorias')
        .select('id, nombre')
        .order('nombre');

    if (catError) {
        console.error('Error selecting categories:', catError.message);
        return;
    }

    console.log('\n--- TIPOS DE TRANSACCION (CATEGORIAS PRINCIPALES) ---');
    data.forEach(t => console.log(`- ${t.nombre} (Flow: ${t.flow}, Active: ${t.active})`));

    console.log('\n--- CATEGORIAS (SUB-CATEGORIAS / PLANTELES) ---');
    categorias.forEach(c => console.log(`- ${c.nombre}`));
}

check();
