-- Migración: Production BC — órdenes de producción y despachos
-- Bounded Context: Production (planta central)
-- Reversión: DROP TABLE production.dispatches; DROP TABLE production.orders; DROP SCHEMA production;

CREATE SCHEMA IF NOT EXISTS production;

-- ─────────────────────────────────────────────────────────────────────────────
-- production.orders — aggregate raíz OrdenDeProduccion
--
-- BOM, mermas y lote se almacenan como snapshots JSONB para preservar la
-- historia del aggregate sin tablas de hijos adicionales.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE production.orders (
  id                  UUID        PRIMARY KEY,
  variante_id         UUID        NOT NULL,
  receta_id           UUID        NOT NULL,
  planta_central_id   UUID        NOT NULL,
  cantidad_a_producir INTEGER     NOT NULL CHECK (cantidad_a_producir > 0),
  estado              TEXT        NOT NULL,
  bom                 JSONB       NOT NULL DEFAULT '[]',
  mermas              JSONB       NOT NULL DEFAULT '[]',
  lote                JSONB,
  creada_por          UUID        NOT NULL,
  creada_en           TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizada_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_production_orders_planta  ON production.orders (planta_central_id);
CREATE INDEX idx_production_orders_estado  ON production.orders (estado);
CREATE INDEX idx_production_orders_creada  ON production.orders (creada_en DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- production.dispatches — aggregate raíz DespachoAPunto
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE production.dispatches (
  id                          UUID        PRIMARY KEY,
  orden_id                    UUID        NOT NULL REFERENCES production.orders (id),
  codigo_lote                 TEXT        NOT NULL,
  cantidad_despachada         INTEGER     NOT NULL CHECK (cantidad_despachada > 0),
  lote_cantidad_total         INTEGER     NOT NULL CHECK (lote_cantidad_total > 0),
  planta_central_id           UUID        NOT NULL,
  punto_de_venta_destino_id   UUID        NOT NULL,
  estado                      TEXT        NOT NULL,
  preparado_por               UUID        NOT NULL,
  creado_en                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_production_dispatches_orden   ON production.dispatches (orden_id);
CREATE INDEX idx_production_dispatches_planta  ON production.dispatches (planta_central_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row-Level Security
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE production.orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE production.dispatches ENABLE ROW LEVEL SECURITY;

CREATE POLICY orders_tenant_isolation ON production.orders
  FOR ALL
  USING (planta_central_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid)
  WITH CHECK (planta_central_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid);

CREATE POLICY dispatches_tenant_isolation ON production.dispatches
  FOR ALL
  USING (planta_central_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid)
  WITH CHECK (planta_central_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid);
