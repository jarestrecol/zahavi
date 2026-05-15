-- ══════════════════════════════════════════════════════════════
-- D-016: sales.mesas — columna actualizada_en (auditoría)
-- D-017: sales — columnas estado/tipo como ENUM PostgreSQL nativo
-- ══════════════════════════════════════════════════════════════

-- ── D-016: actualizada_en en sales.mesas ─────────────────────

ALTER TABLE sales.mesas
  ADD COLUMN actualizada_en TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION sales.set_actualizada_en()
RETURNS TRIGGER
LANGUAGE plpgsql AS
$$
BEGIN
  NEW.actualizada_en = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER mesas_actualizada_en
  BEFORE UPDATE ON sales.mesas
  FOR EACH ROW EXECUTE FUNCTION sales.set_actualizada_en();

-- ── D-017: ENUM types para columnas estado/tipo ───────────────
-- Las tablas de Sales están vacías en este punto (datos operacionales,
-- no de seed), por lo que el USING cast es trivialmente seguro.

CREATE TYPE sales.estado_mesa AS ENUM (
  'LIBRE', 'OCUPADA', 'RESERVADA', 'EN_COBRO'
);

CREATE TYPE sales.tipo_mesa AS ENUM (
  'NORMAL', 'AD_HOC'
);

CREATE TYPE sales.estado_comanda AS ENUM (
  'ABIERTA', 'ENVIADA', 'EN_PREPARACION', 'LISTA', 'CERRADA', 'CANCELADA'
);

CREATE TYPE sales.estado_cobro AS ENUM (
  'PENDIENTE', 'PROCESADO', 'FALLIDO', 'ANULADO'
);

CREATE TYPE sales.estado_factura AS ENUM (
  'EMITIDA', 'ANULADA'
);

ALTER TABLE sales.mesas
  ALTER COLUMN estado TYPE sales.estado_mesa   USING estado::sales.estado_mesa,
  ALTER COLUMN tipo   TYPE sales.tipo_mesa     USING tipo::sales.tipo_mesa;

ALTER TABLE sales.comandas
  ALTER COLUMN estado TYPE sales.estado_comanda USING estado::sales.estado_comanda;

ALTER TABLE sales.cobros
  ALTER COLUMN estado TYPE sales.estado_cobro   USING estado::sales.estado_cobro;

ALTER TABLE sales.facturas
  ALTER COLUMN estado TYPE sales.estado_factura USING estado::sales.estado_factura;

-- Rollback hint:
--   ALTER TABLE sales.mesas DROP COLUMN actualizada_en;
--   DROP TRIGGER IF EXISTS mesas_actualizada_en ON sales.mesas;
--   DROP FUNCTION IF EXISTS sales.set_actualizada_en();
--   ALTER TABLE sales.mesas    ALTER COLUMN estado TYPE TEXT USING estado::text;
--   ALTER TABLE sales.mesas    ALTER COLUMN tipo   TYPE TEXT USING tipo::text;
--   ALTER TABLE sales.comandas ALTER COLUMN estado TYPE TEXT USING estado::text;
--   ALTER TABLE sales.cobros   ALTER COLUMN estado TYPE TEXT USING estado::text;
--   ALTER TABLE sales.facturas ALTER COLUMN estado TYPE TEXT USING estado::text;
--   DROP TYPE sales.estado_mesa; DROP TYPE sales.tipo_mesa;
--   DROP TYPE sales.estado_comanda; DROP TYPE sales.estado_cobro; DROP TYPE sales.estado_factura;
