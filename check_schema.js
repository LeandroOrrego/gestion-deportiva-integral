const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase
        .from('transacciones')
        .select('status')
        .limit(1);

    if (error) {
        console.log('Error selecting status:', error.message);
    } else {
        console.log('Status column exists.');
    }
}

check();
