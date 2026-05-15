-- ============================================================
-- Migration: 20260515000001_sales_rls_hardening
-- D-013: FORCE ROW LEVEL SECURITY en tablas Sales
-- D-014: políticas RLS segregadas por rol (cobros/facturas sin DELETE)
-- D-015: tabla factura_sequences para numeración atómica sin race condition
-- ============================================================

-- ── D-013: FORCE ROW LEVEL SECURITY ─────────────────────────
-- Sin FORCE, el rol owner (postgres) bypassea RLS.
ALTER TABLE sales.mesas     FORCE ROW LEVEL SECURITY;
ALTER TABLE sales.comandas  FORCE ROW LEVEL SECURITY;
ALTER TABLE sales.cobros    FORCE ROW LEVEL SECURITY;
ALTER TABLE sales.facturas  FORCE ROW LEVEL SECURITY;

-- ── D-014: Políticas segregadas ──────────────────────────────
-- Eliminar políticas FOR ALL genéricas
DROP POLICY IF EXISTS mesas_tenant_isolation    ON sales.mesas;
DROP POLICY IF EXISTS comandas_tenant_isolation ON sales.comandas;
DROP POLICY IF EXISTS cobros_tenant_isolation   ON sales.cobros;
DROP POLICY IF EXISTS facturas_tenant_isolation ON sales.facturas;

-- Helper: extrae bu_id del JWT
-- (idéntico al patrón ya usado en inventory/catalog)
-- NOTA: usamos la expresión inline en cada política para no añadir dependencia de función.

-- ── sales.mesas ───────────────────────────────────────────────
-- SELECT: todos los roles autenticados ven su punto de venta
CREATE POLICY mesas_select ON sales.mesas
  FOR SELECT TO authenticated
  USING (
    punto_de_venta_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid
  );

-- INSERT/UPDATE: mesero (WORKER) puede abrir y actualizar mesas en su punto
CREATE POLICY mesas_write ON sales.mesas
  FOR INSERT TO authenticated
  WITH CHECK (
    punto_de_venta_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid
  );

CREATE POLICY mesas_update ON sales.mesas
  FOR UPDATE TO authenticated
  USING (
    punto_de_venta_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid
  )
  WITH CHECK (
    punto_de_venta_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid
  );

-- DELETE: solo SUPERADMIN (limpieza de mesas legacy, operación rara)
CREATE POLICY mesas_delete ON sales.mesas
  FOR DELETE TO authenticated
  USING (
    identity.jwt_rol() = 'SUPERADMIN'
    AND punto_de_venta_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid
  );

-- ── sales.comandas ────────────────────────────────────────────
CREATE POLICY comandas_select ON sales.comandas
  FOR SELECT TO authenticated
  USING (
    punto_de_venta_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid
  );

CREATE POLICY comandas_insert ON sales.comandas
  FOR INSERT TO authenticated
  WITH CHECK (
    punto_de_venta_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid
  );

CREATE POLICY comandas_update ON sales.comandas
  FOR UPDATE TO authenticated
  USING (
    punto_de_venta_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid
  )
  WITH CHECK (
    punto_de_venta_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid
  );

-- DELETE: solo SUPERADMIN (cancelación de comanda ya cerrada por error)
CREATE POLICY comandas_delete ON sales.comandas
  FOR DELETE TO authenticated
  USING (
    identity.jwt_rol() = 'SUPERADMIN'
    AND punto_de_venta_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid
  );

-- ── sales.cobros ──────────────────────────────────────────────
-- Cobros son registros financieros append-only: sin DELETE para nadie.
CREATE POLICY cobros_select ON sales.cobros
  FOR SELECT TO authenticated
  USING (
    punto_de_venta_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid
  );

-- Solo ADMIN/SUPERADMIN procesan cobros
CREATE POLICY cobros_insert ON sales.cobros
  FOR INSERT TO authenticated
  WITH CHECK (
    identity.jwt_rol() IN ('SUPERADMIN', 'ADMIN')
    AND punto_de_venta_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid
  );

-- UPDATE solo para anulación (ADMIN/SUPERADMIN)
CREATE POLICY cobros_update ON sales.cobros
  FOR UPDATE TO authenticated
  USING (
    identity.jwt_rol() IN ('SUPERADMIN', 'ADMIN')
    AND punto_de_venta_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid
  )
  WITH CHECK (
    identity.jwt_rol() IN ('SUPERADMIN', 'ADMIN')
    AND punto_de_venta_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid
  );

-- DELETE: prohibido para todos (registro financiero inmutable)
-- Sin política DELETE = denegación total por RLS.

-- ── sales.facturas ────────────────────────────────────────────
-- Facturas son documentos legales: sin DELETE para nadie.
CREATE POLICY facturas_select ON sales.facturas
  FOR SELECT TO authenticated
  USING (
    punto_de_venta_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid
  );

-- Solo ADMIN/SUPERADMIN emiten facturas
CREATE POLICY facturas_insert ON sales.facturas
  FOR INSERT TO authenticated
  WITH CHECK (
    identity.jwt_rol() IN ('SUPERADMIN', 'ADMIN')
    AND punto_de_venta_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid
  );

-- UPDATE solo para anulación (ADMIN/SUPERADMIN)
CREATE POLICY facturas_update ON sales.facturas
  FOR UPDATE TO authenticated
  USING (
    identity.jwt_rol() IN ('SUPERADMIN', 'ADMIN')
    AND punto_de_venta_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid
  )
  WITH CHECK (
    identity.jwt_rol() IN ('SUPERADMIN', 'ADMIN')
    AND punto_de_venta_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid
  );

-- DELETE: prohibido para todos (documento legal inmutable).

-- ── D-015: Numeración atómica de facturas ────────────────────
-- Reemplaza el COUNT(*)+1 que tiene race condition bajo concurrencia.
-- El patrón INSERT ... ON CONFLICT DO UPDATE ... RETURNING es atómico en PostgreSQL.
CREATE TABLE sales.factura_sequences (
  punto_de_venta_id UUID    NOT NULL,
  anio              INTEGER NOT NULL CHECK (anio >= 2026),
  ultimo_numero     INTEGER NOT NULL DEFAULT 0 CHECK (ultimo_numero >= 0),

  CONSTRAINT pk_factura_sequences PRIMARY KEY (punto_de_venta_id, anio)
);

COMMENT ON TABLE sales.factura_sequences IS
  'Contador atómico de facturas por punto de venta y año. '
  'Usar INSERT ... ON CONFLICT DO UPDATE RETURNING para obtener el siguiente número sin race condition.';

ALTER TABLE sales.factura_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales.factura_sequences FORCE ROW LEVEL SECURITY;

-- Solo el backend (rol postgres superuser) accede a esta tabla.
-- authenticated nunca necesita acceder directamente.
-- Sin políticas para authenticated = acceso denegado por RLS.

GRANT SELECT, INSERT, UPDATE ON sales.factura_sequences TO authenticated;

-- ── DOWN (rollback manual) ────────────────────────────────────
-- DROP TABLE IF EXISTS sales.factura_sequences;
-- DROP POLICY IF EXISTS facturas_update ON sales.facturas;
-- DROP POLICY IF EXISTS facturas_insert ON sales.facturas;
-- DROP POLICY IF EXISTS facturas_select ON sales.facturas;
-- DROP POLICY IF EXISTS cobros_update   ON sales.cobros;
-- DROP POLICY IF EXISTS cobros_insert   ON sales.cobros;
-- DROP POLICY IF EXISTS cobros_select   ON sales.cobros;
-- DROP POLICY IF EXISTS comandas_delete ON sales.comandas;
-- DROP POLICY IF EXISTS comandas_update ON sales.comandas;
-- DROP POLICY IF EXISTS comandas_insert ON sales.comandas;
-- DROP POLICY IF EXISTS comandas_select ON sales.comandas;
-- DROP POLICY IF EXISTS mesas_delete    ON sales.mesas;
-- DROP POLICY IF EXISTS mesas_update    ON sales.mesas;
-- DROP POLICY IF EXISTS mesas_write     ON sales.mesas;
-- DROP POLICY IF EXISTS mesas_select    ON sales.mesas;
-- Re-create original FOR ALL policies and remove FORCE if needed.
