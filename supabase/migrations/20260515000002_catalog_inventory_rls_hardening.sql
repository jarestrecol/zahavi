-- ══════════════════════════════════════════════════════════════
-- D-011: Defensa en profundidad — RLS Catalog + Inventory
-- ══════════════════════════════════════════════════════════════
-- Propósito: verificar el claim zahavi_business_unit_id del JWT
-- contra identity.user_business_units para prevenir ataques IDOR
-- donde un JWT forjado/modificado accede a datos de otra BU.
-- Las políticas anteriores solo verificaban el claim pero no
-- confirmaban la asignación real en la base de datos.
-- ══════════════════════════════════════════════════════════════

-- ── 1. Helper: identity.jwt_bu_id() ─────────────────────────
-- Extrae zahavi_business_unit_id del JWT activo.
-- Misma estrategia dual (claim individual o jsonb) que jwt_rol().
CREATE OR REPLACE FUNCTION identity.jwt_bu_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public AS
$$
  SELECT (COALESCE(
    NULLIF(current_setting('request.jwt.claim.zahavi_business_unit_id', TRUE), ''),
    (NULLIF(current_setting('request.jwt.claims', TRUE), '')::jsonb ->> 'zahavi_business_unit_id')
  ))::uuid;
$$;

COMMENT ON FUNCTION identity.jwt_bu_id() IS
  'Devuelve el claim zahavi_business_unit_id del JWT activo como UUID. '
  'NULL si el claim no está presente. Usar en políticas RLS.';

-- ── 2. Helper: identity.usuario_pertenece_a_bu(bu_id) ────────
-- Verifica en base de datos que auth.uid() pertenezca a la BU dada.
-- SECURITY DEFINER para evitar recursión RLS al consultar user_business_units.
CREATE OR REPLACE FUNCTION identity.usuario_pertenece_a_bu(p_bu_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, identity AS
$$
  SELECT EXISTS (
    SELECT 1
    FROM identity.user_business_units ub
    WHERE ub.user_id     = auth.uid()
      AND ub.business_unit_id = p_bu_id
  );
$$;

COMMENT ON FUNCTION identity.usuario_pertenece_a_bu(UUID) IS
  'Devuelve TRUE si auth.uid() está asignado a la BU dada en user_business_units. '
  'Usar en políticas RLS para defensa en profundidad (verifica asignación real, '
  'no solo el claim del JWT).';

-- ══════════════════════════════════════════════════════════════
-- 3. FORCE ROW LEVEL SECURITY — Catalog
-- ══════════════════════════════════════════════════════════════
ALTER TABLE catalog.categories       FORCE ROW LEVEL SECURITY;
ALTER TABLE catalog.products         FORCE ROW LEVEL SECURITY;
ALTER TABLE catalog.product_variants FORCE ROW LEVEL SECURITY;
ALTER TABLE catalog.recipes          FORCE ROW LEVEL SECURITY;
ALTER TABLE catalog.recipe_lines     FORCE ROW LEVEL SECURITY;
ALTER TABLE catalog.combos           FORCE ROW LEVEL SECURITY;
ALTER TABLE catalog.combo_items      FORCE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════════
-- 4. FORCE ROW LEVEL SECURITY — Inventory
-- ══════════════════════════════════════════════════════════════
ALTER TABLE inventory.suppliers       FORCE ROW LEVEL SECURITY;
ALTER TABLE inventory.ingredients     FORCE ROW LEVEL SECURITY;
ALTER TABLE inventory.stock_items     FORCE ROW LEVEL SECURITY;
ALTER TABLE inventory.stock_movements FORCE ROW LEVEL SECURITY;
ALTER TABLE inventory.stock_alerts    FORCE ROW LEVEL SECURITY;

-- Particiones de stock_movements (mensuales, creadas dinámicamente).
-- Las consultas al API siempre van por la tabla padre, cuya política aplica.
-- FORCE RLS en particiones solo es necesario si se consultan directamente
-- (por superusuarios o mantenimiento), no por el rol authenticated.
ALTER TABLE inventory.stock_movements_default  FORCE ROW LEVEL SECURITY;
ALTER TABLE inventory.stock_movements_y2026m05 FORCE ROW LEVEL SECURITY;
ALTER TABLE inventory.stock_movements_y2026m06 FORCE ROW LEVEL SECURITY;
ALTER TABLE inventory.stock_movements_y2026m07 FORCE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════════
-- 5. Reemplazar políticas Catalog
-- ══════════════════════════════════════════════════════════════
-- El catálogo es GLOBAL (sin bu_id en filas). La defensa en
-- profundidad para escritura verifica que el ADMIN pertenezca
-- a al menos una BU real (no solo que tenga el claim de rol).

-- categories ─────────────────────────────────────────────────
DROP POLICY IF EXISTS categories_write_admin ON catalog.categories;

CREATE POLICY categories_write_admin ON catalog.categories
  FOR ALL TO authenticated
  USING (
    identity.jwt_rol() = 'SUPERADMIN'
    OR (
      identity.jwt_rol() = 'ADMIN'
      AND identity.usuario_pertenece_a_bu(identity.jwt_bu_id())
    )
  )
  WITH CHECK (
    identity.jwt_rol() = 'SUPERADMIN'
    OR (
      identity.jwt_rol() = 'ADMIN'
      AND identity.usuario_pertenece_a_bu(identity.jwt_bu_id())
    )
  );

-- products ────────────────────────────────────────────────────
DROP POLICY IF EXISTS products_write_admin ON catalog.products;

CREATE POLICY products_write_admin ON catalog.products
  FOR ALL TO authenticated
  USING (
    identity.jwt_rol() = 'SUPERADMIN'
    OR (
      identity.jwt_rol() = 'ADMIN'
      AND identity.usuario_pertenece_a_bu(identity.jwt_bu_id())
    )
  )
  WITH CHECK (
    identity.jwt_rol() = 'SUPERADMIN'
    OR (
      identity.jwt_rol() = 'ADMIN'
      AND identity.usuario_pertenece_a_bu(identity.jwt_bu_id())
    )
  );

-- product_variants ─────────────────────────────────────────────
DROP POLICY IF EXISTS product_variants_write_admin ON catalog.product_variants;

CREATE POLICY product_variants_write_admin ON catalog.product_variants
  FOR ALL TO authenticated
  USING (
    identity.jwt_rol() = 'SUPERADMIN'
    OR (
      identity.jwt_rol() = 'ADMIN'
      AND identity.usuario_pertenece_a_bu(identity.jwt_bu_id())
    )
  )
  WITH CHECK (
    identity.jwt_rol() = 'SUPERADMIN'
    OR (
      identity.jwt_rol() = 'ADMIN'
      AND identity.usuario_pertenece_a_bu(identity.jwt_bu_id())
    )
  );

-- recipes ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS recipes_select_admin ON catalog.recipes;
DROP POLICY IF EXISTS recipes_write_admin  ON catalog.recipes;

CREATE POLICY recipes_select_admin ON catalog.recipes
  FOR SELECT TO authenticated
  USING (
    identity.jwt_rol() = 'SUPERADMIN'
    OR (
      identity.jwt_rol() = 'ADMIN'
      AND identity.usuario_pertenece_a_bu(identity.jwt_bu_id())
    )
  );

CREATE POLICY recipes_write_admin ON catalog.recipes
  FOR ALL TO authenticated
  USING (
    identity.jwt_rol() = 'SUPERADMIN'
    OR (
      identity.jwt_rol() = 'ADMIN'
      AND identity.usuario_pertenece_a_bu(identity.jwt_bu_id())
    )
  )
  WITH CHECK (
    identity.jwt_rol() = 'SUPERADMIN'
    OR (
      identity.jwt_rol() = 'ADMIN'
      AND identity.usuario_pertenece_a_bu(identity.jwt_bu_id())
    )
  );

-- recipe_lines ─────────────────────────────────────────────────
DROP POLICY IF EXISTS recipe_lines_select_admin ON catalog.recipe_lines;
DROP POLICY IF EXISTS recipe_lines_write_admin  ON catalog.recipe_lines;

CREATE POLICY recipe_lines_select_admin ON catalog.recipe_lines
  FOR SELECT TO authenticated
  USING (
    identity.jwt_rol() = 'SUPERADMIN'
    OR (
      identity.jwt_rol() = 'ADMIN'
      AND identity.usuario_pertenece_a_bu(identity.jwt_bu_id())
    )
  );

CREATE POLICY recipe_lines_write_admin ON catalog.recipe_lines
  FOR ALL TO authenticated
  USING (
    identity.jwt_rol() = 'SUPERADMIN'
    OR (
      identity.jwt_rol() = 'ADMIN'
      AND identity.usuario_pertenece_a_bu(identity.jwt_bu_id())
    )
  )
  WITH CHECK (
    identity.jwt_rol() = 'SUPERADMIN'
    OR (
      identity.jwt_rol() = 'ADMIN'
      AND identity.usuario_pertenece_a_bu(identity.jwt_bu_id())
    )
  );

-- combos ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS combos_write_admin ON catalog.combos;

CREATE POLICY combos_write_admin ON catalog.combos
  FOR ALL TO authenticated
  USING (
    identity.jwt_rol() = 'SUPERADMIN'
    OR (
      identity.jwt_rol() = 'ADMIN'
      AND identity.usuario_pertenece_a_bu(identity.jwt_bu_id())
    )
  )
  WITH CHECK (
    identity.jwt_rol() = 'SUPERADMIN'
    OR (
      identity.jwt_rol() = 'ADMIN'
      AND identity.usuario_pertenece_a_bu(identity.jwt_bu_id())
    )
  );

-- combo_items ──────────────────────────────────────────────────
DROP POLICY IF EXISTS combo_items_write_admin ON catalog.combo_items;

CREATE POLICY combo_items_write_admin ON catalog.combo_items
  FOR ALL TO authenticated
  USING (
    identity.jwt_rol() = 'SUPERADMIN'
    OR (
      identity.jwt_rol() = 'ADMIN'
      AND identity.usuario_pertenece_a_bu(identity.jwt_bu_id())
    )
  )
  WITH CHECK (
    identity.jwt_rol() = 'SUPERADMIN'
    OR (
      identity.jwt_rol() = 'ADMIN'
      AND identity.usuario_pertenece_a_bu(identity.jwt_bu_id())
    )
  );

-- ══════════════════════════════════════════════════════════════
-- 6. Reemplazar políticas Inventory con defensa en profundidad
-- ══════════════════════════════════════════════════════════════

-- suppliers ────────────────────────────────────────────────────
DROP POLICY IF EXISTS suppliers_select_admin ON inventory.suppliers;
DROP POLICY IF EXISTS suppliers_write_admin  ON inventory.suppliers;

CREATE POLICY suppliers_select_admin ON inventory.suppliers
  FOR SELECT TO authenticated
  USING (
    identity.jwt_rol() = 'SUPERADMIN'
    OR (
      identity.jwt_rol() = 'ADMIN'
      AND identity.usuario_pertenece_a_bu(identity.jwt_bu_id())
    )
  );

CREATE POLICY suppliers_write_admin ON inventory.suppliers
  FOR ALL TO authenticated
  USING (
    identity.jwt_rol() = 'SUPERADMIN'
    OR (
      identity.jwt_rol() = 'ADMIN'
      AND identity.usuario_pertenece_a_bu(identity.jwt_bu_id())
    )
  )
  WITH CHECK (
    identity.jwt_rol() = 'SUPERADMIN'
    OR (
      identity.jwt_rol() = 'ADMIN'
      AND identity.usuario_pertenece_a_bu(identity.jwt_bu_id())
    )
  );

-- ingredients ──────────────────────────────────────────────────
-- WORKER puede leer (sin bu_id en fila), pero WRITE requiere BU real.
DROP POLICY IF EXISTS ingredients_write_admin ON inventory.ingredients;

CREATE POLICY ingredients_write_admin ON inventory.ingredients
  FOR ALL TO authenticated
  USING (
    identity.jwt_rol() = 'SUPERADMIN'
    OR (
      identity.jwt_rol() = 'ADMIN'
      AND identity.usuario_pertenece_a_bu(identity.jwt_bu_id())
    )
  )
  WITH CHECK (
    identity.jwt_rol() = 'SUPERADMIN'
    OR (
      identity.jwt_rol() = 'ADMIN'
      AND identity.usuario_pertenece_a_bu(identity.jwt_bu_id())
    )
  );

-- stock_items ──────────────────────────────────────────────────
-- SELECT: verifica BU del JWT contra filas Y contra user_business_units.
-- INSERT/UPDATE: verifica BU real del usuario.
DROP POLICY IF EXISTS stock_items_select        ON inventory.stock_items;
DROP POLICY IF EXISTS stock_items_insert_admin  ON inventory.stock_items;
DROP POLICY IF EXISTS stock_items_update_admin  ON inventory.stock_items;
DROP POLICY IF EXISTS stock_items_delete_superadmin ON inventory.stock_items;

CREATE POLICY stock_items_select ON inventory.stock_items
  FOR SELECT TO authenticated
  USING (
    identity.jwt_rol() = 'SUPERADMIN'
    OR (
      identity.jwt_rol() = 'ADMIN'
      AND business_unit_id = identity.jwt_bu_id()
      AND identity.usuario_pertenece_a_bu(identity.jwt_bu_id())
    )
  );

CREATE POLICY stock_items_insert_admin ON inventory.stock_items
  FOR INSERT TO authenticated
  WITH CHECK (
    identity.jwt_rol() = 'SUPERADMIN'
    OR (
      identity.jwt_rol() = 'ADMIN'
      AND identity.usuario_pertenece_a_bu(identity.jwt_bu_id())
    )
  );

CREATE POLICY stock_items_update_admin ON inventory.stock_items
  FOR UPDATE TO authenticated
  USING (
    identity.jwt_rol() = 'SUPERADMIN'
    OR (
      identity.jwt_rol() = 'ADMIN'
      AND business_unit_id = identity.jwt_bu_id()
      AND identity.usuario_pertenece_a_bu(identity.jwt_bu_id())
    )
  )
  WITH CHECK (
    identity.jwt_rol() = 'SUPERADMIN'
    OR (
      identity.jwt_rol() = 'ADMIN'
      AND identity.usuario_pertenece_a_bu(identity.jwt_bu_id())
    )
  );

CREATE POLICY stock_items_delete_superadmin ON inventory.stock_items
  FOR DELETE TO authenticated
  USING (identity.jwt_rol() = 'SUPERADMIN');

-- stock_movements ──────────────────────────────────────────────
-- Tabla append-only (UPDATE/DELETE bloqueados por trigger).
-- INSERT requiere BU real del usuario.
DROP POLICY IF EXISTS stock_movements_select    ON inventory.stock_movements;
DROP POLICY IF EXISTS stock_movements_insert    ON inventory.stock_movements;

CREATE POLICY stock_movements_select ON inventory.stock_movements
  FOR SELECT TO authenticated
  USING (
    identity.jwt_rol() = 'SUPERADMIN'
    OR (
      identity.jwt_rol() = 'ADMIN'
      AND business_unit_id = identity.jwt_bu_id()
      AND identity.usuario_pertenece_a_bu(identity.jwt_bu_id())
    )
  );

CREATE POLICY stock_movements_insert ON inventory.stock_movements
  FOR INSERT TO authenticated
  WITH CHECK (
    identity.jwt_rol() = 'SUPERADMIN'
    OR (
      identity.jwt_rol() = 'ADMIN'
      AND identity.usuario_pertenece_a_bu(identity.jwt_bu_id())
    )
  );

-- stock_alerts ─────────────────────────────────────────────────
DROP POLICY IF EXISTS stock_alerts_select          ON inventory.stock_alerts;
DROP POLICY IF EXISTS stock_alerts_insert_admin    ON inventory.stock_alerts;
DROP POLICY IF EXISTS stock_alerts_update_admin    ON inventory.stock_alerts;
DROP POLICY IF EXISTS stock_alerts_delete_superadmin ON inventory.stock_alerts;

CREATE POLICY stock_alerts_select ON inventory.stock_alerts
  FOR SELECT TO authenticated
  USING (
    identity.jwt_rol() = 'SUPERADMIN'
    OR (
      identity.jwt_rol() = 'ADMIN'
      AND business_unit_id = identity.jwt_bu_id()
      AND identity.usuario_pertenece_a_bu(identity.jwt_bu_id())
    )
  );

CREATE POLICY stock_alerts_insert_admin ON inventory.stock_alerts
  FOR INSERT TO authenticated
  WITH CHECK (
    identity.jwt_rol() = 'SUPERADMIN'
    OR (
      identity.jwt_rol() = 'ADMIN'
      AND identity.usuario_pertenece_a_bu(identity.jwt_bu_id())
    )
  );

CREATE POLICY stock_alerts_update_admin ON inventory.stock_alerts
  FOR UPDATE TO authenticated
  USING (
    identity.jwt_rol() = 'SUPERADMIN'
    OR (
      identity.jwt_rol() = 'ADMIN'
      AND business_unit_id = identity.jwt_bu_id()
      AND identity.usuario_pertenece_a_bu(identity.jwt_bu_id())
    )
  )
  WITH CHECK (
    identity.jwt_rol() = 'SUPERADMIN'
    OR (
      identity.jwt_rol() = 'ADMIN'
      AND identity.usuario_pertenece_a_bu(identity.jwt_bu_id())
    )
  );

CREATE POLICY stock_alerts_delete_superadmin ON inventory.stock_alerts
  FOR DELETE TO authenticated
  USING (identity.jwt_rol() = 'SUPERADMIN');

-- ══════════════════════════════════════════════════════════════
-- Rollback hint:
--   DROP FUNCTION IF EXISTS identity.jwt_bu_id();
--   DROP FUNCTION IF EXISTS identity.usuario_pertenece_a_bu(UUID);
--   ALTER TABLE catalog.* NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE inventory.* NO FORCE ROW LEVEL SECURITY;
--   -- Restaurar políticas originales desde 20260512000001_catalog_schema.sql
--   -- y 20260512000002_inventory_schema.sql
-- ══════════════════════════════════════════════════════════════
