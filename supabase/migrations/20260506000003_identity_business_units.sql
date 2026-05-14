-- ============================================================
-- Migration: 20260506000003_identity_business_units
-- BC Identity: unidades de negocio y asignaciones usuario-unidad
-- ============================================================

-- ── 1. Tabla: identity.business_units ────────────────────────
CREATE TABLE identity.business_units (
  id        UUID        NOT NULL DEFAULT gen_random_uuid(),
  nombre    TEXT        NOT NULL,
  tipo      TEXT        NOT NULL CHECK (tipo IN ('produccion', 'punto_de_venta')),
  estado    TEXT        NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'inactiva')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT pk_business_units PRIMARY KEY (id),
  CONSTRAINT uq_business_units_nombre UNIQUE (nombre)
);

COMMENT ON TABLE identity.business_units IS 'Unidades de negocio (planta central y puntos de venta). Referenciadas por JWT claim bu_id.';

CREATE INDEX idx_business_units_tipo   ON identity.business_units (tipo);
CREATE INDEX idx_business_units_estado ON identity.business_units (estado);

-- ── 2. Tabla: identity.user_business_units ───────────────────
CREATE TABLE identity.user_business_units (
  user_id          UUID        NOT NULL REFERENCES identity.usuarios(id) ON DELETE CASCADE,
  business_unit_id UUID        NOT NULL REFERENCES identity.business_units(id) ON DELETE CASCADE,
  asignado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  asignado_por     UUID        REFERENCES identity.usuarios(id) ON DELETE SET NULL,

  CONSTRAINT pk_user_business_units PRIMARY KEY (user_id, business_unit_id)
);

COMMENT ON TABLE identity.user_business_units IS 'Asignación many-to-many entre usuarios y unidades de negocio. Usada para validar el claim bu_id del JWT (defensa en profundidad ADR-0003).';

CREATE INDEX idx_ubu_user  ON identity.user_business_units (user_id);
CREATE INDEX idx_ubu_bunit ON identity.user_business_units (business_unit_id);

-- ── 3. RLS ───────────────────────────────────────────────────
ALTER TABLE identity.business_units      ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.user_business_units ENABLE ROW LEVEL SECURITY;

-- business_units: todos los autenticados pueden leer; solo SUPERADMIN escribe
CREATE POLICY pol_business_units_select ON identity.business_units
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY pol_business_units_write ON identity.business_units
  FOR ALL TO authenticated
  USING   (identity.jwt_rol() = 'SUPERADMIN')
  WITH CHECK (identity.jwt_rol() = 'SUPERADMIN');

-- user_business_units: SUPERADMIN gestiona todo; cada usuario ve las suyas
CREATE POLICY pol_ubu_superadmin ON identity.user_business_units
  FOR ALL TO authenticated
  USING   (identity.jwt_rol() = 'SUPERADMIN')
  WITH CHECK (identity.jwt_rol() = 'SUPERADMIN');

CREATE POLICY pol_ubu_self_select ON identity.user_business_units
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ── 4. Grants ────────────────────────────────────────────────
GRANT SELECT ON identity.business_units TO authenticated;
GRANT INSERT, UPDATE, DELETE ON identity.business_units TO authenticated;
GRANT SELECT ON identity.user_business_units TO authenticated;
GRANT INSERT, UPDATE, DELETE ON identity.user_business_units TO authenticated;

-- ── DOWN (rollback manual) ────────────────────────────────────
-- DROP TABLE IF EXISTS identity.user_business_units;
-- DROP TABLE IF EXISTS identity.business_units;
