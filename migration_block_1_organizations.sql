-- =============================================
-- BLOQUE 1: ORGANIZATIONS + MIGRACIÓN PERFILES
-- =============================================

-- 1. Crear tabla organizations (raíz del sistema multi-tenant)
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  country text DEFAULT 'Paraguay',
  city text,
  subscription_status text DEFAULT 'trial'
    CHECK (subscription_status IN ('active','trial','suspended','cancelled')),
  subscription_plan text DEFAULT 'basic'
    CHECK (subscription_plan IN ('basic','standard','premium')),
  active boolean DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Insertar el primer club (Club Naranjal)
INSERT INTO public.organizations (name, city, subscription_status, subscription_plan)
VALUES ('Club Naranjal', 'Naranjal', 'active', 'premium')
ON CONFLICT DO NOTHING;

-- 3. Agregar columnas faltantes a perfiles
ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id),
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 4. Actualizar el rol de OBSERVADOR a viewer (nuevo naming)
ALTER TABLE public.perfiles
  DROP CONSTRAINT IF EXISTS perfiles_rol_check;

ALTER TABLE public.perfiles
  ADD CONSTRAINT perfiles_rol_check
  CHECK (rol IN ('super_admin', 'admin', 'treasurer', 'viewer'));

-- 5. Asignar Club Naranjal a todos los perfiles existentes
UPDATE public.perfiles
SET organization_id = (SELECT id FROM public.organizations WHERE name = 'Club Naranjal' LIMIT 1)
WHERE organization_id IS NULL;

-- 6. Habilitar RLS en organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 7. Trigger updated_at para organizations
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_organizations ON public.organizations;
CREATE TRIGGER set_updated_at_organizations
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_perfiles ON public.perfiles;
CREATE TRIGGER set_updated_at_perfiles
  BEFORE UPDATE ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
