-- =============================================
-- 3. Verificación Post-Migración
-- =============================================

-- 1. Verificar que todas las tablas existen
SELECT table_name 
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name IN ('athlete_agreements', 'atletas', 'categorias', 'events', 'organizations', 'perfiles', 'transaction_types', 'transacciones')
ORDER BY table_name;

-- 2. Verificar datos semilla (Tipos de transacción por defecto)
SELECT flow, area, COUNT(*) as cantidad
FROM public.transaction_types
WHERE is_default = true
GROUP BY flow, area 
ORDER BY flow, area;

-- 3. Verificar categorías del Club Naranjal
SELECT c.nombre, c.payment_model, c.organization_id, o.name as organization_name
FROM public.categorias c
JOIN public.organizations o ON c.organization_id = o.id
WHERE o.name = 'Club Naranjal'
ORDER BY c.sort_order;

-- 4. Verificar RLS activo en todas las tablas
SELECT tablename, rowsecurity 
FROM pg_tables
WHERE schemaname = 'public' 
ORDER BY tablename;
