-- Migración: Sales BC — mesas, comandas, cobros, facturas
-- Reversión: db/migrations/down/0007_sales.sql

-- ─────────────────────────────────────────────────────────────────────────────
-- Schema
-- ─────────────────────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS sales;

-- ─────────────────────────────────────────────────────────────────────────────
-- sales.mesas — aggregate raíz Mesa
--
-- Representa una mesa del salón (NORMAL) o una mesa efímera creada por el
-- mesero en el momento (AD_HOC). El estado y la comanda activa se actualizan
-- en cada transición del aggregate.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE sales.mesas (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre              TEXT        NOT NULL,
  tipo                TEXT        NOT NULL,   -- NORMAL | AD_HOC
  punto_de_venta_id   UUID        NOT NULL,   -- business_unit_id (punto de venta)
  estado              TEXT        NOT NULL,   -- LIBRE | OCUPADA | RESERVADA | EN_COBRO
  comanda_activa_id   UUID,                   -- NULL cuando LIBRE o RESERVADA
  creada_en           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_mesas_punto   ON sales.mesas (punto_de_venta_id);
CREATE INDEX idx_sales_mesas_estado  ON sales.mesas (estado);

-- ─────────────────────────────────────────────────────────────────────────────
-- sales.comandas — aggregate raíz Comanda
--
-- Las líneas se almacenan como snapshot JSONB para evitar joins; una comanda
-- rara vez supera 30 líneas y el snapshot preserva nombre y precio del
-- momento de la venta aunque el catálogo cambie después.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE sales.comandas (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_id             UUID        NOT NULL REFERENCES sales.mesas (id),
  punto_de_venta_id   UUID        NOT NULL,
  estado              TEXT        NOT NULL,   -- ABIERTA | ENVIADA | EN_PREPARACION | LISTA | CERRADA | CANCELADA
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
-- sales.cobros — aggregate raíz Cobro
--
-- Los pagos se guardan como snapshot JSONB (método + monto). Un cobro puede
-- combinarse con múltiples métodos de pago (efectivo + NEQUI, etc.).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE sales.cobros (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  comanda_id          UUID        NOT NULL REFERENCES sales.comandas (id),
  punto_de_venta_id   UUID        NOT NULL,
  total_comanda       INTEGER     NOT NULL CHECK (total_comanda >= 0),
  pagos               JSONB       NOT NULL DEFAULT '[]',
  total_cobrado       INTEGER     NOT NULL DEFAULT 0 CHECK (total_cobrado >= 0),
  cambio              INTEGER     NOT NULL DEFAULT 0 CHECK (cambio >= 0),
  estado              TEXT        NOT NULL,   -- PENDIENTE | PROCESADO | FALLIDO | ANULADO
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
-- sales.facturas — aggregate raíz Factura
--
-- Recibo interno (MVP). Las líneas son snapshot inmutable de la comanda al
-- momento del cierre. Numeración secuencial por punto de venta + año.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE sales.facturas (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cobro_id            UUID        NOT NULL REFERENCES sales.cobros (id),
  comanda_id          UUID        NOT NULL REFERENCES sales.comandas (id),
  punto_de_venta_id   UUID        NOT NULL,
  numero              TEXT        NOT NULL,   -- FAC-YYYY-NNNNN
  lineas              JSONB       NOT NULL DEFAULT '[]',
  subtotal            INTEGER     NOT NULL CHECK (subtotal >= 0),
  total_iva           INTEGER     NOT NULL DEFAULT 0 CHECK (total_iva >= 0),
  total               INTEGER     NOT NULL CHECK (total >= 0),
  estado              TEXT        NOT NULL,   -- EMITIDA | ANULADA
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
--
-- Toda tabla filtra por punto_de_venta_id == JWT.bu_id.
-- Defensa en profundidad: el servidor también filtra en la query Kysely.
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
