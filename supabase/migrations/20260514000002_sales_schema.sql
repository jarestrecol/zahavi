-- Migración: Sales BC — mesas, comandas, cobros, facturas
-- Bounded Context: Sales (punto de venta)
-- Reversión: DROP TABLE sales.facturas; DROP TABLE sales.cobros; DROP TABLE sales.comandas; DROP TABLE sales.mesas; DROP SCHEMA sales;

CREATE SCHEMA IF NOT EXISTS sales;

-- ─────────────────────────────────────────────────────────────────────────────
-- sales.mesas
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE sales.mesas (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre              TEXT        NOT NULL,
  tipo                TEXT        NOT NULL,
  punto_de_venta_id   UUID        NOT NULL,
  estado              TEXT        NOT NULL,
  comanda_activa_id   UUID,
  creada_en           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_mesas_punto   ON sales.mesas (punto_de_venta_id);
CREATE INDEX idx_sales_mesas_estado  ON sales.mesas (estado);

-- ─────────────────────────────────────────────────────────────────────────────
-- sales.comandas
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE sales.comandas (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_id             UUID        NOT NULL REFERENCES sales.mesas (id),
  punto_de_venta_id   UUID        NOT NULL,
  estado              TEXT        NOT NULL,
  lineas              JSONB       NOT NULL DEFAULT '[]',
  tomada_por          UUID        NOT NULL,
  cerrada_por         UUID,
  motivo_cancelacion  TEXT,
  abierta_en          TIMESTAMPTZ NOT NULL DEFAULT now(),
  cerrada_en          TIMESTAMPTZ
);

CREATE INDEX idx_sales_comandas_punto   ON sales.comandas (punto_de_venta_id);
CREATE INDEX idx_sales_comandas_mesa    ON sales.comandas (mesa_id);
CREATE INDEX idx_sales_comandas_estado  ON sales.comandas (estado);
CREATE INDEX idx_sales_comandas_abierta ON sales.comandas (abierta_en DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- sales.cobros
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE sales.cobros (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  comanda_id          UUID        NOT NULL REFERENCES sales.comandas (id),
  punto_de_venta_id   UUID        NOT NULL,
  total_comanda       INTEGER     NOT NULL CHECK (total_comanda >= 0),
  pagos               JSONB       NOT NULL DEFAULT '[]',
  total_cobrado       INTEGER     NOT NULL DEFAULT 0 CHECK (total_cobrado >= 0),
  cambio              INTEGER     NOT NULL DEFAULT 0 CHECK (cambio >= 0),
  estado              TEXT        NOT NULL,
  cobrado_por         UUID        NOT NULL,
  creado_en           TIMESTAMPTZ NOT NULL DEFAULT now(),
  procesado_en        TIMESTAMPTZ,
  motivo_anulacion    TEXT
);

CREATE INDEX idx_sales_cobros_punto    ON sales.cobros (punto_de_venta_id);
CREATE INDEX idx_sales_cobros_comanda  ON sales.cobros (comanda_id);
CREATE INDEX idx_sales_cobros_estado   ON sales.cobros (estado);
CREATE INDEX idx_sales_cobros_creado   ON sales.cobros (creado_en DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- sales.facturas
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE sales.facturas (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cobro_id            UUID        NOT NULL REFERENCES sales.cobros (id),
  comanda_id          UUID        NOT NULL REFERENCES sales.comandas (id),
  punto_de_venta_id   UUID        NOT NULL,
  numero              TEXT        NOT NULL,
  lineas              JSONB       NOT NULL DEFAULT '[]',
  subtotal            INTEGER     NOT NULL CHECK (subtotal >= 0),
  total_iva           INTEGER     NOT NULL DEFAULT 0 CHECK (total_iva >= 0),
  total               INTEGER     NOT NULL CHECK (total >= 0),
  estado              TEXT        NOT NULL,
  emitida_en          TIMESTAMPTZ NOT NULL DEFAULT now(),
  anulada_en          TIMESTAMPTZ,
  motivo_anulacion    TEXT
);

CREATE UNIQUE INDEX idx_sales_facturas_numero ON sales.facturas (punto_de_venta_id, numero);
CREATE INDEX idx_sales_facturas_punto         ON sales.facturas (punto_de_venta_id);
CREATE INDEX idx_sales_facturas_cobro         ON sales.facturas (cobro_id);
CREATE INDEX idx_sales_facturas_emitida       ON sales.facturas (emitida_en DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row-Level Security
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE sales.mesas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales.comandas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales.cobros    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales.facturas  ENABLE ROW LEVEL SECURITY;

CREATE POLICY mesas_tenant_isolation ON sales.mesas
  FOR ALL
  USING (punto_de_venta_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid)
  WITH CHECK (punto_de_venta_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid);

CREATE POLICY comandas_tenant_isolation ON sales.comandas
  FOR ALL
  USING (punto_de_venta_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid)
  WITH CHECK (punto_de_venta_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid);

CREATE POLICY cobros_tenant_isolation ON sales.cobros
  FOR ALL
  USING (punto_de_venta_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid)
  WITH CHECK (punto_de_venta_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid);

CREATE POLICY facturas_tenant_isolation ON sales.facturas
  FOR ALL
  USING (punto_de_venta_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid)
  WITH CHECK (punto_de_venta_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid);
