const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function applySql() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        console.log('Connected to DB');

        const sql = fs.readFileSync('fix_transactions_rls.sql', 'utf8');
        console.log('Applying SQL...');
        
        await client.query(sql);
        console.log('✅ RLS policies updated successfully.');

    } catch (err) {
        console.error('Error applying SQL:', err.message);
    } finally {
        await client.end();
    }
}

applySql();
