
-- List all check constraints on the 'transacciones' table
SELECT
    con.conname AS constraint_name,
    con.consrc AS constraint_definition
FROM
    pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = con.connamespace
WHERE
    nsp.nspname = 'public'
    AND rel.relname = 'transacciones'
    AND con.contype = 'c';
