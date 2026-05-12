-- ============================================================
-- Migration: 20260512000002_inventory_schema
-- BC Inventory: ingredientes, stock, movimientos, proveedores, alertas
-- ============================================================

-- ── 1. Schema ────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS inventory;
COMMENT ON SCHEMA inventory IS 'Bounded Context Inventory: ingredientes, stock por unidad de negocio, movimientos y alertas.';

-- ── 2. Función updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION inventory.set_actualizado_en()
RETURNS TRIGGER
LANGUAGE plpgsql AS
$$
BEGIN
  NEW.actualizado_en = now();
  RETURN NEW;
END;
$$;
COMMENT ON FUNCTION inventory.set_actualizado_en() IS 'Actualiza actualizado_en en cada UPDATE.';

-- ── 3. Tabla: inventory.suppliers ────────────────────────────
CREATE TABLE inventory.suppliers (
  id             UUID        NOT NULL DEFAULT gen_random_uuid(),
  nombre         TEXT        NOT NULL,
  contacto       TEXT        NOT NULL DEFAULT '',
  notas          TEXT        NOT NULL DEFAULT '',
  estado         TEXT        NOT NULL DEFAULT 'activo'
                             CHECK (estado IN ('activo', 'inactivo')),
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT suppliers_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE inventory.suppliers IS 'Proveedores de materias primas e ingredientes.';

CREATE INDEX suppliers_estado_idx ON inventory.suppliers (estado);

CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON inventory.suppliers
  FOR EACH ROW EXECUTE FUNCTION inventory.set_actualizado_en();

-- ── 4. Tabla: inventory.ingredients ─────────────────────────
CREATE TABLE inventory.ingredients (
  id                    UUID        NOT NULL DEFAULT gen_random_uuid(),
  nombre                TEXT        NOT NULL,
  unidad_nativa         TEXT        NOT NULL
                        CHECK (unidad_nativa IN ('kg', 'g', 'L', 'mL', 'unidad')),
  costo_unitario_actual BIGINT      NOT NULL DEFAULT 0 CHECK (costo_unitario_actual >= 0),
  umbral_de_alerta      NUMERIC(12,4) NOT NULL DEFAULT 0 CHECK (umbral_de_alerta >= 0),
  estado                TEXT        NOT NULL DEFAULT 'activo'
                        CHECK (estado IN ('activo', 'inactivo')),
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ingredients_pkey PRIMARY KEY (id),
  CONSTRAINT ingredients_nombre_unique UNIQUE (nombre)
);

COMMENT ON TABLE inventory.ingredients IS 'Definición de ingredientes y materias primas (sin stock). Stock en stock_items.';
COMMENT ON COLUMN inventory.ingredients.costo_unitario_actual IS 'Costo unitario en COP por unidad_nativa. Actualizado en cada compra.';
COMMENT ON COLUMN inventory.ingredients.umbral_de_alerta IS 'Cantidad mínima antes de emitir alerta. 0 = sin alerta.';

CREATE INDEX ingredients_estado_idx ON inventory.ingredients (estado);

CREATE TRIGGER ingredients_updated_at
  BEFORE UPDATE ON inventory.ingredients
  FOR EACH ROW EXECUTE FUNCTION inventory.set_actualizado_en();

-- ── 5. Tabla: inventory.stock_items ──────────────────────────
-- Stock de un ingrediente en una unidad de negocio específica.
CREATE TABLE inventory.stock_items (
  id                     UUID         NOT NULL DEFAULT gen_random_uuid(),
  ingredient_id          UUID         NOT NULL REFERENCES inventory.ingredients(id) ON DELETE RESTRICT,
  business_unit_id       UUID         NOT NULL,           -- referencia a la unidad de negocio (Identity BC)
  cantidad_disponible    NUMERIC(12,4) NOT NULL DEFAULT 0 CHECK (cantidad_disponible >= 0),
  unidad_nativa          TEXT         NOT NULL,
  costo_promedio_cop     BIGINT       NOT NULL DEFAULT 0  CHECK (costo_promedio_cop >= 0),
  version                INTEGER      NOT NULL DEFAULT 1  CHECK (version >= 1),
  actualizado_en         TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT stock_items_pkey PRIMARY KEY (id),
  CONSTRAINT stock_items_ingredient_bunit_unique UNIQUE (ingredient_id, business_unit_id)
);

COMMENT ON TABLE inventory.stock_items IS 'Nivel de stock de un ingrediente por unidad de negocio. Actualizado en cada movimiento.';
COMMENT ON COLUMN inventory.stock_items.business_unit_id IS 'UUID de la unidad de negocio (planta central o punto de venta). Sin FK para mantener independencia de BC.';
COMMENT ON COLUMN inventory.stock_items.costo_promedio_cop IS 'Costo promedio ponderado en COP por unidad_nativa. Recalculado en cada PURCHASE_IN.';
COMMENT ON COLUMN inventory.stock_items.version IS 'Número de versión para detección de conflictos de concurrencia optimista.';

CREATE INDEX stock_items_ingredient_idx ON inventory.stock_items (ingredient_id);
CREATE INDEX stock_items_bunit_idx ON inventory.stock_items (business_unit_id);

-- ── 6. Tabla: inventory.stock_movements (append-only) ────────
CREATE TABLE inventory.stock_movements (
  id               UUID         NOT NULL DEFAULT gen_random_uuid(),
  ingredient_id    UUID         NOT NULL REFERENCES inventory.ingredients(id) ON DELETE RESTRICT,
  business_unit_id UUID         NOT NULL,
  tipo_movimiento  TEXT         NOT NULL
                   CHECK (tipo_movimiento IN (
                     'PURCHASE_IN', 'PRODUCTION_OUT', 'WASTE',
                     'TRANSFER_BETWEEN_UNITS', 'ADJUSTMENT', 'SALE_OUT', 'RESERVATION'
                   )),
  cantidad         NUMERIC(12,4) NOT NULL,
  unidad           TEXT         NOT NULL,
  costo_unitario   BIGINT       NOT NULL DEFAULT 0 CHECK (costo_unitario >= 0),
  referencia       TEXT         NOT NULL DEFAULT '',     -- ID externo (produccion, venta, etc.)
  motivo           TEXT         NOT NULL DEFAULT '',     -- para WASTE, ADJUSTMENT
  supplier_id      UUID         REFERENCES inventory.suppliers(id) ON DELETE SET NULL,
  ocurrido_en      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  registrado_por   UUID         NOT NULL,                -- usuario que registró (Identity BC)

  CONSTRAINT stock_movements_pkey PRIMARY KEY (id)
) PARTITION BY RANGE (ocurrido_en);

COMMENT ON TABLE inventory.stock_movements IS 'Log append-only de todos los movimientos de stock. Nunca se actualiza ni elimina. Particionado mensualmente.';
COMMENT ON COLUMN inventory.stock_movements.referencia IS 'Referencia externa (orden de producción, venta, etc.). Vacío para ajustes manuales.';
COMMENT ON COLUMN inventory.stock_movements.costo_unitario IS 'Costo unitario al momento del movimiento (COP). 0 para salidas.';

-- Partición inicial — mes actual
CREATE TABLE inventory.stock_movements_y2026m05
  PARTITION OF inventory.stock_movements
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE inventory.stock_movements_y2026m06
  PARTITION OF inventory.stock_movements
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE TABLE inventory.stock_movements_y2026m07
  PARTITION OF inventory.stock_movements
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE TABLE inventory.stock_movements_default
  PARTITION OF inventory.stock_movements DEFAULT;

CREATE INDEX stock_movements_ingredient_idx ON inventory.stock_movements (ingredient_id, ocurrido_en DESC);
CREATE INDEX stock_movements_bunit_idx ON inventory.stock_movements (business_unit_id, ocurrido_en DESC);
CREATE INDEX stock_movements_tipo_idx ON inventory.stock_movements (tipo_movimiento);

-- Garantizar que stock_movements sea append-only: prohibir UPDATE y DELETE
CREATE RULE stock_movements_no_update AS ON UPDATE TO inventory.stock_movements DO INSTEAD NOTHING;
CREATE RULE stock_movements_no_delete AS ON DELETE TO inventory.stock_movements DO INSTEAD NOTHING;

-- ── 7. Tabla: inventory.stock_alerts ─────────────────────────
CREATE TABLE inventory.stock_alerts (
  id               UUID        NOT NULL DEFAULT gen_random_uuid(),
  ingredient_id    UUID        NOT NULL REFERENCES inventory.ingredients(id) ON DELETE CASCADE,
  business_unit_id UUID        NOT NULL,
  stock_al_momento NUMERIC(12,4) NOT NULL,
  umbral_al_momento NUMERIC(12,4) NOT NULL,
  unidad           TEXT        NOT NULL,
  estado           TEXT        NOT NULL DEFAULT 'abierta'
                   CHECK (estado IN ('abierta', 'cerrada', 'anulada')),
  creada_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
  cierre_en        TIMESTAMPTZ,

  CONSTRAINT stock_alerts_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE inventory.stock_alerts IS 'Alertas de stock mínimo. Solo se tiene una alerta abierta por ingrediente + unidad de negocio.';

CREATE UNIQUE INDEX stock_alerts_open_unique ON inventory.stock_alerts (ingredient_id, business_unit_id)
  WHERE estado = 'abierta';

CREATE INDEX stock_alerts_estado_idx ON inventory.stock_alerts (estado);
CREATE INDEX stock_alerts_ingredient_idx ON inventory.stock_alerts (ingredient_id);

-- ══════════════════════════════════════════════════════════════
-- RLS — Row Level Security
-- ══════════════════════════════════════════════════════════════

ALTER TABLE inventory.suppliers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory.ingredients      ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory.stock_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory.stock_movements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory.stock_alerts     ENABLE ROW LEVEL SECURITY;

-- ── Políticas: inventory.suppliers ──────────────────────────
-- WORKER: no accede a proveedores.
CREATE POLICY suppliers_select_admin ON inventory.suppliers
  FOR SELECT TO authenticated
  USING (identity.jwt_rol() IN ('SUPERADMIN', 'ADMIN'));

CREATE POLICY suppliers_write_admin ON inventory.suppliers
  FOR ALL TO authenticated
  USING   (identity.jwt_rol() IN ('SUPERADMIN', 'ADMIN'))
  WITH CHECK (identity.jwt_rol() IN ('SUPERADMIN', 'ADMIN'));

-- ── Políticas: inventory.ingredients ────────────────────────
-- WORKER: puede leer ingredientes activos (para menú y ordenes).
CREATE POLICY ingredients_select_all ON inventory.ingredients
  FOR SELECT TO authenticated
  USING (
    CASE identity.jwt_rol()
      WHEN 'WORKER' THEN estado = 'activo'
      ELSE true
    END
  );

CREATE POLICY ingredients_write_admin ON inventory.ingredients
  FOR ALL TO authenticated
  USING   (identity.jwt_rol() IN ('SUPERADMIN', 'ADMIN'))
  WITH CHECK (identity.jwt_rol() IN ('SUPERADMIN', 'ADMIN'));

-- ── Políticas: inventory.stock_items ────────────────────────
-- SUPERADMIN: ve todo. ADMIN: ve su business_unit. WORKER: no.
CREATE POLICY stock_items_select ON inventory.stock_items
  FOR SELECT TO authenticated
  USING (
    identity.jwt_rol() = 'SUPERADMIN'
    OR (
      identity.jwt_rol() = 'ADMIN'
      AND business_unit_id::text = COALESCE(
        current_setting('request.jwt.claim.zahavi_business_unit_id', TRUE),
        (NULLIF(current_setting('request.jwt.claims', TRUE), '')::jsonb ->> 'zahavi_business_unit_id')
      )
    )
  );

CREATE POLICY stock_items_write_admin ON inventory.stock_items
  FOR ALL TO authenticated
  USING   (identity.jwt_rol() IN ('SUPERADMIN', 'ADMIN'))
  WITH CHECK (identity.jwt_rol() IN ('SUPERADMIN', 'ADMIN'));

-- ── Políticas: inventory.stock_movements ────────────────────
CREATE POLICY stock_movements_select ON inventory.stock_movements
  FOR SELECT TO authenticated
  USING (
    identity.jwt_rol() = 'SUPERADMIN'
    OR (
      identity.jwt_rol() = 'ADMIN'
      AND business_unit_id::text = COALESCE(
        current_setting('request.jwt.claim.zahavi_business_unit_id', TRUE),
        (NULLIF(current_setting('request.jwt.claims', TRUE), '')::jsonb ->> 'zahavi_business_unit_id')
      )
    )
  );

-- INSERT solo para ADMIN/SUPERADMIN (no hay UPDATE ni DELETE por regla)
CREATE POLICY stock_movements_insert ON inventory.stock_movements
  FOR INSERT TO authenticated
  WITH CHECK (identity.jwt_rol() IN ('SUPERADMIN', 'ADMIN'));

-- ── Políticas: inventory.stock_alerts ───────────────────────
CREATE POLICY stock_alerts_select ON inventory.stock_alerts
  FOR SELECT TO authenticated
  USING (
    identity.jwt_rol() = 'SUPERADMIN'
    OR (
      identity.jwt_rol() = 'ADMIN'
      AND business_unit_id::text = COALESCE(
        current_setting('request.jwt.claim.zahavi_business_unit_id', TRUE),
        (NULLIF(current_setting('request.jwt.claims', TRUE), '')::jsonb ->> 'zahavi_business_unit_id')
      )
    )
  );

CREATE POLICY stock_alerts_write_admin ON inventory.stock_alerts
  FOR ALL TO authenticated
  USING   (identity.jwt_rol() IN ('SUPERADMIN', 'ADMIN'))
  WITH CHECK (identity.jwt_rol() IN ('SUPERADMIN', 'ADMIN'));

-- ── Fin de migración ─────────────────────────────────────────
