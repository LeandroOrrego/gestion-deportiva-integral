-- Habilitar permisos para que el script de migración pueda escribir
-- en las tablas 'conceptos_finanzas' y 'transacciones'.

-- 1. Conceptos Finanzas
alter table conceptos_finanzas enable row level security;

create policy "Permitir select publico conceptos"
on conceptos_finanzas for select
to public
using (true);

create policy "Permitir insert publico conceptos"
on conceptos_finanzas for insert
to public
with check (true);

-- 2. Transacciones (asegurar que tenga permisos si es la tabla del usuario)
alter table transacciones enable row level security;

create policy "Permitir insert publico transacciones"
on transacciones for insert
to public
with check (true);

create policy "Permitir select publico transacciones"
on transacciones for select
to public
using (true);
