-- =============================================
-- BLOQUE 2: CATEGORIAS + ATLETAS (uuid)
-- =============================================

-- 1. Recrear categorias con uuid y columnas completas
DROP TABLE IF EXISTS public.atletas CASCADE;
DROP TABLE IF EXISTS public.categorias CASCADE;

CREATE TABLE public.categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  nombre text NOT NULL,
  descripcion text,
  payment_model text NOT NULL DEFAULT 'viaticos_only'
    CHECK (payment_model IN ('viaticos_only', 'prizes_and_viaticos')),
  sort_order integer DEFAULT 0,
  active boolean DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Insertar las 4 categorías del Club Naranjal
INSERT INTO public.categorias (organization_id, nombre, payment_model, sort_order)
SELECT
  o.id,
  cat.nombre,
  cat.modelo,
  cat.orden
FROM public.organizations o,
(VALUES
  ('Sub-15', 'viaticos_only', 1),
  ('Sub-19', 'prizes_and_viaticos', 2),
  ('Senior', 'viaticos_only', 3),
  ('Primera', 'prizes_and_viaticos', 4)
) AS cat(nombre, modelo, orden)
WHERE o.name = 'Club Naranjal';

-- 3. Recrear atletas con uuid y columnas completas
CREATE TABLE public.atletas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  category_id uuid REFERENCES public.categorias(id),
  nombre_completo text NOT NULL,
  documento text,
  fecha_nacimiento date,
  posicion text,
  status text DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'loaned', 'transferred')),
  photo_url text,
  notes text,
  active boolean DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Habilitar RLS
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atletas ENABLE ROW LEVEL SECURITY;

-- 5. Triggers updated_at
DROP TRIGGER IF EXISTS set_updated_at_categorias ON public.categorias;
CREATE TRIGGER set_updated_at_categorias
  BEFORE UPDATE ON public.categorias
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_atletas ON public.atletas;
CREATE TRIGGER set_updated_at_atletas
  BEFORE UPDATE ON public.atletas
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. Índices
CREATE INDEX IF NOT EXISTS idx_categorias_organization_id ON public.categorias(organization_id);
CREATE INDEX IF NOT EXISTS idx_categorias_deleted_at ON public.categorias(deleted_at);
CREATE INDEX IF NOT EXISTS idx_atletas_organization_id ON public.atletas(organization_id);
CREATE INDEX IF NOT EXISTS idx_atletas_category_id ON public.atletas(category_id);
CREATE INDEX IF NOT EXISTS idx_atletas_deleted_at ON public.atletas(deleted_at);


-- =============================================
-- BLOQUE 3: TRANSACTION_TYPES (antes conceptos_finanzas)
-- =============================================

-- 1. Renombrar la tabla existente
ALTER TABLE IF EXISTS public.conceptos_finanzas
  RENAME TO transaction_types;

-- 2. Migrar id de bigint a uuid
-- Primero eliminar la tabla de transacciones que referencia concepto_id
DROP TABLE IF EXISTS public.transacciones CASCADE;

-- Recrear transaction_types con estructura correcta
DROP TABLE IF EXISTS public.transaction_types CASCADE;

CREATE TABLE public.transaction_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  nombre text NOT NULL,
  flow text NOT NULL CHECK (flow IN ('income', 'expense')),
  area text NOT NULL CHECK (area IN ('sport', 'admin', 'event')),
  is_default boolean DEFAULT false,
  active boolean DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Insertar tipos de transacción por defecto en español
INSERT INTO public.transaction_types (nombre, flow, area, is_default) VALUES
-- INGRESOS - Evento
('Boletería', 'income', 'event', true),
('Estacionamiento', 'income', 'event', true),
('Venta de bebidas', 'income', 'event', true),
('Venta de comidas', 'income', 'event', true),
-- INGRESOS - Deportivo
('Venta de atleta', 'income', 'sport', true),
('Préstamo de atleta', 'income', 'sport', true),
-- INGRESOS - Administrativo
('Auspicio / Sponsor', 'income', 'admin', true),
('Venta de camisetas de hinchada', 'income', 'admin', true),
('Otros ingresos', 'income', 'admin', true),
-- EGRESOS - Deportivo
('Viáticos / Combustible', 'expense', 'sport', true),
('Premio por victoria', 'expense', 'sport', true),
('Premio por empate', 'expense', 'sport', true),
('Premio por derrota', 'expense', 'sport', true),
('Pase de atleta', 'expense', 'sport', true),
('Prima de atleta', 'expense', 'sport', true),
('Pago de árbitros', 'expense', 'sport', true),
('Documentación de Liga', 'expense', 'sport', true),
('Gastos de práctica', 'expense', 'sport', true),
('Porcentaje Liga (boletería)', 'expense', 'sport', true),
('Porcentaje Liga (transferencia)', 'expense', 'sport', true),
-- EGRESOS - Administrativo
('Mantenimiento del club', 'expense', 'admin', true),
('Compra de insumos (cantina)', 'expense', 'admin', true),
('Compra de bebidas', 'expense', 'admin', true),
('Compra de camisetas', 'expense', 'admin', true),
('Servicios (luz/agua/internet)', 'expense', 'admin', true),
('Gastos administrativos', 'expense', 'admin', true),
('Otros gastos', 'expense', 'admin', true);

-- 4. RLS, trigger e índices
ALTER TABLE public.transaction_types ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_updated_at_transaction_types ON public.transaction_types;
CREATE TRIGGER set_updated_at_transaction_types
  BEFORE UPDATE ON public.transaction_types
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_tt_organization_id ON public.transaction_types(organization_id);
CREATE INDEX IF NOT EXISTS idx_tt_flow_area ON public.transaction_types(flow, area);


-- =============================================
-- BLOQUE 4: EVENTS + TRANSACCIONES + ATHLETE_AGREEMENTS
-- =============================================

-- 1. Crear tabla events
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  category_id uuid REFERENCES public.categorias(id),
  fecha date NOT NULL,
  rival text,
  ubicacion text DEFAULT 'home'
    CHECK (ubicacion IN ('home', 'away')),
  resultado text DEFAULT 'pending'
    CHECK (resultado IN ('win', 'draw', 'loss', 'pending')),
  goles_favor integer,
  goles_contra integer,
  status text DEFAULT 'planned'
    CHECK (status IN ('planned','in_progress','pre_closed','closed')),
  notas text,
  active boolean DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Recrear transacciones con estructura completa
CREATE TABLE IF NOT EXISTS public.transacciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  event_id uuid REFERENCES public.events(id),
  category_id uuid REFERENCES public.categorias(id),
  atleta_id uuid REFERENCES public.atletas(id),
  transaction_type_id uuid REFERENCES public.transaction_types(id),
  flow text NOT NULL CHECK (flow IN ('income', 'expense')),
  monto bigint NOT NULL,
  descripcion text,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  status text DEFAULT 'pending'
    CHECK (status IN ('pending','pre_confirmed','confirmed','voided')),
  fecha_vencimiento date,
  comprobante_url text,
  source text DEFAULT 'manual'
    CHECK (source IN ('manual', 'message', 'system')),
  created_by uuid REFERENCES public.perfiles(id),
  active boolean DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Crear tabla athlete_agreements
CREATE TABLE IF NOT EXISTS public.athlete_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  atleta_id uuid NOT NULL REFERENCES public.atletas(id),
  temporada text NOT NULL,
  etapa text,
  premio_victoria bigint DEFAULT 0,
  premio_empate bigint DEFAULT 0,
  premio_derrota bigint DEFAULT 0,
  viatico_base bigint DEFAULT 0,
  vigente_desde date NOT NULL,
  vigente_hasta date,
  active boolean DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. RLS en las 3 tablas
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_agreements ENABLE ROW LEVEL SECURITY;

-- 5. Triggers updated_at
DROP TRIGGER IF EXISTS set_updated_at_events ON public.events;
CREATE TRIGGER set_updated_at_events BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_transacciones ON public.transacciones;
CREATE TRIGGER set_updated_at_transacciones BEFORE UPDATE ON public.transacciones
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_agreements ON public.athlete_agreements;
CREATE TRIGGER set_updated_at_agreements BEFORE UPDATE ON public.athlete_agreements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. Índices para performance
CREATE INDEX IF NOT EXISTS idx_events_organization_id ON public.events(organization_id);
CREATE INDEX IF NOT EXISTS idx_events_fecha ON public.events(fecha);
CREATE INDEX IF NOT EXISTS idx_events_deleted_at ON public.events(deleted_at);
CREATE INDEX IF NOT EXISTS idx_trans_organization_id ON public.transacciones(organization_id);
CREATE INDEX IF NOT EXISTS idx_trans_event_id ON public.transacciones(event_id);
CREATE INDEX IF NOT EXISTS idx_trans_atleta_id ON public.transacciones(atleta_id);
CREATE INDEX IF NOT EXISTS idx_trans_fecha ON public.transacciones(fecha);
CREATE INDEX IF NOT EXISTS idx_trans_status ON public.transacciones(status);
CREATE INDEX IF NOT EXISTS idx_trans_deleted_at ON public.transacciones(deleted_at);
CREATE INDEX IF NOT EXISTS idx_agreements_atleta_id ON public.athlete_agreements(atleta_id);
CREATE INDEX IF NOT EXISTS idx_agreements_vigente ON public.athlete_agreements(vigente_desde, vigente_hasta);


-- =============================================
-- BLOQUE 5: POLÍTICAS RLS
-- =============================================
-- Función auxiliar para obtener org_id del usuario actual
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid AS $$
  SELECT organization_id FROM public.perfiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Función auxiliar para obtener rol del usuario actual
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
  SELECT rol FROM public.perfiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---- ORGANIZATIONS ----
DROP POLICY IF EXISTS "org_select" ON public.organizations;
CREATE POLICY "org_select" ON public.organizations FOR SELECT
  USING (id = get_my_org_id() OR get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "org_superadmin_all" ON public.organizations;
CREATE POLICY "org_superadmin_all" ON public.organizations FOR ALL
  USING (get_my_role() = 'super_admin');

-- ---- PERFILES ----
DROP POLICY IF EXISTS "perfiles_select" ON public.perfiles;
CREATE POLICY "perfiles_select" ON public.perfiles FOR SELECT
  USING (organization_id = get_my_org_id() OR get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "perfiles_insert" ON public.perfiles;
CREATE POLICY "perfiles_insert" ON public.perfiles FOR INSERT
  WITH CHECK (
    get_my_role() IN ('super_admin', 'admin')
    AND (organization_id = get_my_org_id() OR get_my_role() = 'super_admin')
  );

DROP POLICY IF EXISTS "perfiles_update" ON public.perfiles;
CREATE POLICY "perfiles_update" ON public.perfiles FOR UPDATE
  USING (organization_id = get_my_org_id() OR get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() IN ('super_admin', 'admin') OR id = auth.uid());

-- ---- CATEGORIAS ----
DROP POLICY IF EXISTS "cat_select" ON public.categorias;
CREATE POLICY "cat_select" ON public.categorias FOR SELECT
  USING (organization_id = get_my_org_id() OR get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "cat_write" ON public.categorias;
CREATE POLICY "cat_write" ON public.categorias FOR ALL
  USING (organization_id = get_my_org_id() AND get_my_role() IN ('super_admin','admin'));

-- ---- ATLETAS ----
DROP POLICY IF EXISTS "atletas_select" ON public.atletas;
CREATE POLICY "atletas_select" ON public.atletas FOR SELECT
  USING (organization_id = get_my_org_id() OR get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "atletas_write" ON public.atletas;
CREATE POLICY "atletas_write" ON public.atletas FOR ALL
  USING (
    organization_id = get_my_org_id()
    AND get_my_role() IN ('super_admin','admin','treasurer')
  );

-- ---- TRANSACTION_TYPES ----
DROP POLICY IF EXISTS "tt_select" ON public.transaction_types;
CREATE POLICY "tt_select" ON public.transaction_types FOR SELECT
  USING (
    organization_id IS NULL
    OR organization_id = get_my_org_id()
    OR get_my_role() = 'super_admin'
  );

DROP POLICY IF EXISTS "tt_write" ON public.transaction_types;
CREATE POLICY "tt_write" ON public.transaction_types FOR ALL
  USING (get_my_role() IN ('super_admin','admin'));

-- ---- EVENTS ----
DROP POLICY IF EXISTS "events_select" ON public.events;
CREATE POLICY "events_select" ON public.events FOR SELECT
  USING (organization_id = get_my_org_id() OR get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "events_write" ON public.events;
CREATE POLICY "events_write" ON public.events FOR ALL
  USING (
    organization_id = get_my_org_id()
    AND get_my_role() IN ('super_admin','admin','treasurer')
  );

-- ---- TRANSACCIONES ----
DROP POLICY IF EXISTS "trans_select" ON public.transacciones;
CREATE POLICY "trans_select" ON public.transacciones FOR SELECT
  USING (organization_id = get_my_org_id() OR get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "trans_insert_update" ON public.transacciones;
CREATE POLICY "trans_insert_update" ON public.transacciones
  FOR INSERT WITH CHECK (
    organization_id = get_my_org_id()
    AND get_my_role() IN ('super_admin','admin','treasurer')
  );

-- ---- ATHLETE_AGREEMENTS ----
DROP POLICY IF EXISTS "agree_select" ON public.athlete_agreements;
CREATE POLICY "agree_select" ON public.athlete_agreements FOR SELECT
  USING (organization_id = get_my_org_id() OR get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "agree_write" ON public.athlete_agreements;
CREATE POLICY "agree_write" ON public.athlete_agreements FOR ALL
  USING (
    organization_id = get_my_org_id()
    AND get_my_role() IN ('super_admin','admin','treasurer')
  );
