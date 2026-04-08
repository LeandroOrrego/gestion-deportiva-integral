require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function verifyMigration() {
    try {
        await client.connect();

        // Check Categories
        const resCat = await client.query(`SELECT count(*) FROM public.categorias WHERE nombre = 'Sub-15'`);
        console.log(`Categories found (Sub-15): ${resCat.rows[0].count}`);

        // Check Transaction Types
        const resTT = await client.query(`SELECT count(*) FROM public.transaction_types WHERE flow = 'expense'`);
        console.log(`Transaction Types found (expense): ${resTT.rows[0].count}`);

        // Check Events Table Existence
        const resEvents = await client.query(`SELECT to_regclass('public.events')`);
        console.log(`Events table exists: ${!!resEvents.rows[0].to_regclass}`);

    } catch (err) {
        console.error('Verification failed:', err);
    } finally {
        await client.end();
    }
}

verifyMigration();
