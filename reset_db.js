const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetDatabase() {
    console.log('🗑️  Limpiando base de datos...');

    // 1. Eliminar todas las transacciones
    const { error: errTrans } = await supabase
        .from('transacciones')
        .delete()
        .neq('id', 0); // Hack para borrar todo (id != 0)

    if (errTrans) console.error('Error borrando transacciones:', errTrans.message);
    else console.log('✅ Transacciones eliminadas.');

    // 2. Eliminar conceptos (opcional, pero recomendado para limpiar basura como "ID_Movimiento")
    const { error: errCon } = await supabase
        .from('conceptos_finanzas')
        .delete()
        .neq('id', 0);

    if (errCon) console.error('Error borrando conceptos:', errCon.message);
    else console.log('✅ Conceptos eliminados.');

    console.log('✨ Base de datos limpia. Lista para re-migrar.');
}

resetDatabase();
