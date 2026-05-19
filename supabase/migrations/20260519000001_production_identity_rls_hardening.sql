-- ============================================================
-- Migration: 20260519000001_production_identity_rls_hardening
-- Resuelve hallazgos críticos auditados el 2026-05-19:
--   C-001/C-002/C-003: FORCE RLS + políticas segregadas + GRANTs production
--   C-005:  GRANT columnar en identity.usuarios (excluye hashes sensibles)
--   SEC-M1: FORCE RLS en tablas identity que faltaban
--   DB-M1/M2: triggers updated_at en production.orders y production.dispatches
--   DB-m5: índice en production.dispatches.punto_de_venta_destino_id
-- ============================================================

-- ── Funciones updated_at para production ─────────────────────
-- production.orders usa columna "actualizada_en" (femenino),
-- distinto del patrón "actualizado_en" del resto de schemas.
-- Se crea función propia para evitar error de columna inexistente.

CREATE OR REPLACE FUNCTION production.set_actualizada_en()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.actualizada_en = now();
  RETURN NEW;
END;
$$;
COMMENT ON FUNCTION production.set_actualizada_en() IS 'Actualiza actualizada_en en production.orders en cada UPDATE.';

-- production.dispatches usa "actualizado_en" (estándar)
CREATE OR REPLACE FUNCTION production.set_actualizado_en()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.actualizado_en = now();
  RETURN NEW;
END;
$$;
COMMENT ON FUNCTION production.set_actualizado_en() IS 'Actualiza actualizado_en en production.dispatches en cada UPDATE.';

-- ── Triggers updated_at ───────────────────────────────────────
CREATE TRIGGER set_actualizada_en_orders
  BEFORE UPDATE ON production.orders
  FOR EACH ROW EXECUTE FUNCTION production.set_actualizada_en();

CREATE TRIGGER set_actualizado_en_dispatches
  BEFORE UPDATE ON production.dispatches
  FOR EACH ROW EXECUTE FUNCTION production.set_actualizado_en();

-- ── Índice faltante en dispatches ────────────────────────────
CREATE INDEX IF NOT EXISTS idx_production_dispatches_destino
  ON production.dispatches (punto_de_venta_destino_id);

-- ── C-001: FORCE ROW LEVEL SECURITY en production ────────────
ALTER TABLE production.orders     FORCE ROW LEVEL SECURITY;
ALTER TABLE production.dispatches FORCE ROW LEVEL SECURITY;

-- ── C-002: Reemplazar políticas FOR ALL por políticas segregadas
--    con verificación de rol (SUPERADMIN/ADMIN pueden escribir)
DROP POLICY IF EXISTS orders_tenant_isolation     ON production.orders;
DROP POLICY IF EXISTS dispatches_tenant_isolation ON production.dispatches;

-- production.orders — SELECT: todos los roles autenticados ven su planta
CREATE POLICY orders_select ON production.orders
  FOR SELECT TO authenticated
  USING (
    planta_central_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid
  );

-- production.orders — INSERT: ADMIN y SUPERADMIN de su planta
CREATE POLICY orders_insert ON production.orders
  FOR INSERT TO authenticated
  WITH CHECK (
    planta_central_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid
    AND (current_setting('request.jwt.claims', true)::jsonb ->> 'zahavi_rol') IN ('ADMIN', 'SUPERADMIN')
  );

-- production.orders — UPDATE: ADMIN y SUPERADMIN de su planta
CREATE POLICY orders_update ON production.orders
  FOR UPDATE TO authenticated
  USING (
    planta_central_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid
  )
  WITH CHECK (
    planta_central_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid
    AND (current_setting('request.jwt.claims', true)::jsonb ->> 'zahavi_rol') IN ('ADMIN', 'SUPERADMIN')
  );

-- production.orders — DELETE: solo SUPERADMIN
CREATE POLICY orders_delete ON production.orders
  FOR DELETE TO authenticated
  USING (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'zahavi_rol') = 'SUPERADMIN'
    AND planta_central_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid
  );

-- production.dispatches — SELECT
CREATE POLICY dispatches_select ON production.dispatches
  FOR SELECT TO authenticated
  USING (
    planta_central_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid
  );

-- production.dispatches — INSERT: ADMIN y SUPERADMIN de su planta
CREATE POLICY dispatches_insert ON production.dispatches
  FOR INSERT TO authenticated
  WITH CHECK (
    planta_central_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid
    AND (current_setting('request.jwt.claims', true)::jsonb ->> 'zahavi_rol') IN ('ADMIN', 'SUPERADMIN')
  );

-- production.dispatches — UPDATE: ADMIN y SUPERADMIN
CREATE POLICY dispatches_update ON production.dispatches
  FOR UPDATE TO authenticated
  USING (
    planta_central_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid
  )
  WITH CHECK (
    planta_central_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid
    AND (current_setting('request.jwt.claims', true)::jsonb ->> 'zahavi_rol') IN ('ADMIN', 'SUPERADMIN')
  );

-- production.dispatches — DELETE: solo SUPERADMIN
CREATE POLICY dispatches_delete ON production.dispatches
  FOR DELETE TO authenticated
  USING (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'zahavi_rol') = 'SUPERADMIN'
    AND planta_central_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'bu_id')::uuid
  );

-- ── C-003: GRANTs para schema production (faltaban) ──────────
GRANT USAGE ON SCHEMA production TO authenticated;
GRANT SELECT, INSERT, UPDATE ON production.orders     TO authenticated;
GRANT SELECT, INSERT, UPDATE ON production.dispatches TO authenticated;

-- ── SEC-M1: FORCE RLS en tablas identity que faltaban ─────────
ALTER TABLE identity.usuarios                      FORCE ROW LEVEL SECURITY;
ALTER TABLE identity.sesiones                      FORCE ROW LEVEL SECURITY;
ALTER TABLE identity.dispositivos_autorizados      FORCE ROW LEVEL SECURITY;
ALTER TABLE identity.historial_estados_dispositivo FORCE ROW LEVEL SECURITY;
ALTER TABLE identity.business_units                FORCE ROW LEVEL SECURITY;
ALTER TABLE identity.user_business_units           FORCE ROW LEVEL SECURITY;

-- ── C-005: Restringir GRANTs de identity.usuarios a columnas no sensibles
-- hash_contrasena, hash_pin y secreto_totp nunca deben escribirse via PostgREST.
REVOKE INSERT, UPDATE ON identity.usuarios FROM authenticated;
GRANT INSERT (
  email, nombre_completo, rol, estado, tipo_credencial,
  totp_verificado, creado_por
) ON identity.usuarios TO authenticated;
GRANT UPDATE (
  nombre_completo, rol, estado, tipo_credencial, totp_verificado
) ON identity.usuarios TO authenticated;

-- ============================================================
-- DOWN (rollback manual):
--   DROP TRIGGER IF EXISTS set_actualizada_en_orders    ON production.orders;
--   DROP TRIGGER IF EXISTS set_actualizado_en_dispatches ON production.dispatches;
--   DROP FUNCTION IF EXISTS production.set_actualizada_en();
--   DROP FUNCTION IF EXISTS production.set_actualizado_en();
--   DROP INDEX  IF EXISTS idx_production_dispatches_destino;
--   ALTER TABLE production.orders     NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE production.dispatches NO FORCE ROW LEVEL SECURITY;
--   DROP POLICY IF EXISTS orders_select    ON production.orders;
--   DROP POLICY IF EXISTS orders_insert    ON production.orders;
--   DROP POLICY IF EXISTS orders_update    ON production.orders;
--   DROP POLICY IF EXISTS orders_delete    ON production.orders;
--   DROP POLICY IF EXISTS dispatches_select  ON production.dispatches;
--   DROP POLICY IF EXISTS dispatches_insert  ON production.dispatches;
--   DROP POLICY IF EXISTS dispatches_update  ON production.dispatches;
--   DROP POLICY IF EXISTS dispatches_delete  ON production.dispatches;
--   REVOKE USAGE  ON SCHEMA production FROM authenticated;
--   REVOKE SELECT, INSERT, UPDATE ON production.orders     FROM authenticated;
--   REVOKE SELECT, INSERT, UPDATE ON production.dispatches FROM authenticated;
--   ALTER TABLE identity.usuarios                      NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE identity.sesiones                      NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE identity.dispositivos_autorizados      NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE identity.historial_estados_dispositivo NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE identity.business_units                NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE identity.user_business_units           NO FORCE ROW LEVEL SECURITY;
--   REVOKE INSERT (email,nombre_completo,rol,estado,tipo_credencial,totp_verificado,creado_por) ON identity.usuarios FROM authenticated;
--   REVOKE UPDATE (nombre_completo,rol,estado,tipo_credencial,totp_verificado) ON identity.usuarios FROM authenticated;
--   GRANT INSERT, UPDATE ON identity.usuarios TO authenticated;
-- ============================================================
