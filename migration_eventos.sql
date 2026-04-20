-- ============================================================================
-- Módulo de Eventos / Partidos
-- Ejecutar este script en Supabase SQL Editor
-- ============================================================================

-- ── Tabla: eventos ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS eventos (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fecha           DATE NOT NULL,
    tipo            TEXT NOT NULL CHECK (tipo IN ('Partido', 'Practica')),
    categoria_id    UUID REFERENCES categorias(id) ON DELETE SET NULL,
    rival           TEXT,
    resultado       TEXT CHECK (resultado IS NULL OR resultado IN ('Victoria', 'Empate', 'Derrota')),
    estado          TEXT NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Liquidado')),
    organization_id UUID NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Tabla: evento_asistencia ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS evento_asistencia (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    evento_id   UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    atleta_id   UUID NOT NULL REFERENCES atletas(id) ON DELETE CASCADE,
    asistio     BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now(),

    -- Un atleta solo puede tener un registro de asistencia por evento
    UNIQUE (evento_id, atleta_id)
);

-- ── Índices ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_eventos_organization ON eventos (organization_id);
CREATE INDEX IF NOT EXISTS idx_eventos_fecha ON eventos (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_eventos_categoria ON eventos (categoria_id);
CREATE INDEX IF NOT EXISTS idx_evento_asistencia_evento ON evento_asistencia (evento_id);
CREATE INDEX IF NOT EXISTS idx_evento_asistencia_atleta ON evento_asistencia (atleta_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE evento_asistencia ENABLE ROW LEVEL SECURITY;

-- Política para eventos: solo ver/editar los de tu organización
CREATE POLICY "Eventos: ver propios"
    ON eventos FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM perfiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Eventos: insertar propios"
    ON eventos FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM perfiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Eventos: actualizar propios"
    ON eventos FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM perfiles WHERE id = auth.uid()
        )
    );

-- Política para asistencia: basada en el evento y su org
CREATE POLICY "Asistencia: ver propios"
    ON evento_asistencia FOR SELECT
    USING (
        evento_id IN (
            SELECT id FROM eventos WHERE organization_id IN (
                SELECT organization_id FROM perfiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Asistencia: insertar propios"
    ON evento_asistencia FOR INSERT
    WITH CHECK (
        evento_id IN (
            SELECT id FROM eventos WHERE organization_id IN (
                SELECT organization_id FROM perfiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Asistencia: actualizar propios"
    ON evento_asistencia FOR UPDATE
    USING (
        evento_id IN (
            SELECT id FROM eventos WHERE organization_id IN (
                SELECT organization_id FROM perfiles WHERE id = auth.uid()
            )
        )
    );

-- ============================================================================
-- Fin del script
-- ============================================================================
