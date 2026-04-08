-- La tabla 'perfiles' tiene RLS activado pero ninguna política,
-- lo que significa que nadie puede leerla por defecto.

-- Esta política permite que CUALQUIER usuario (public) pueda leer los perfiles.
-- Útil para mostrar nombres de usuarios en la UI.
create policy "Permitir lectura de perfiles"
on perfiles for select
to public
using (true);

-- Si prefieres que solo el propio usuario pueda editar su perfil:
create policy "Usuarios pueden editar propio perfil"
on perfiles for update
using (auth.uid() = id);
