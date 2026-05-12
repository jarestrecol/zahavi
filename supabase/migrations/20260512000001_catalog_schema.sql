-- ============================================================
-- Migration: 20260512000001_catalog_schema
-- BC Catalog: categorías, productos, variantes, recetas, combos
-- ============================================================

-- ── 1. Schema ────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS catalog;
COMMENT ON SCHEMA catalog IS 'Bounded Context Catalog: menú, productos, variantes, recetas y combos.';

-- ── 2. Función updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION catalog.set_actualizado_en()
RETURNS TRIGGER
LANGUAGE plpgsql AS
$$
BEGIN
  NEW.actualizado_en = now();
  RETURN NEW;
END;
$$;
COMMENT ON FUNCTION catalog.set_actualizado_en() IS 'Actualiza actualizado_en en cada UPDATE.';

-- ── 3. Tabla: catalog.categories ─────────────────────────────
CREATE TABLE catalog.categories (
  id             UUID        NOT NULL DEFAULT gen_random_uuid(),
  nombre         TEXT        NOT NULL,
  padre_id       UUID        REFERENCES catalog.categories(id) ON DELETE RESTRICT,
  orden          INTEGER     NOT NULL DEFAULT 0,
  estado         TEXT        NOT NULL DEFAULT 'activa'
                             CHECK (estado IN ('activa', 'archivada')),
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_nombre_padre_unique UNIQUE (nombre, padre_id),
  CONSTRAINT categories_orden_positivo CHECK (orden >= 0),
  CONSTRAINT categories_no_auto_referencia CHECK (id <> padre_id)
);

COMMENT ON TABLE catalog.categories IS 'Clasificadores jerárquicos del menú (máx. 3 niveles).';
COMMENT ON COLUMN catalog.categories.padre_id IS 'NULL para categorías raíz.';
COMMENT ON COLUMN catalog.categories.orden IS 'Orden visual dentro del padre. Entero >= 0.';

CREATE INDEX categories_padre_id_idx ON catalog.categories (padre_id);
CREATE INDEX categories_estado_idx ON catalog.categories (estado);

CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON catalog.categories
  FOR EACH ROW EXECUTE FUNCTION catalog.set_actualizado_en();

-- ── 4. Tabla: catalog.products ───────────────────────────────
CREATE TABLE catalog.products (
  id             UUID        NOT NULL DEFAULT gen_random_uuid(),
  nombre         TEXT        NOT NULL,
  categoria_id   UUID        NOT NULL REFERENCES catalog.categories(id) ON DELETE RESTRICT,
  imagen_url     TEXT,
  estado         TEXT        NOT NULL DEFAULT 'borrador'
                             CHECK (estado IN ('borrador', 'activo')),
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_nombre_categoria_unique UNIQUE (nombre, categoria_id)
);

COMMENT ON TABLE catalog.products IS 'Productos vendibles del menú Zahavi.';
COMMENT ON COLUMN catalog.products.imagen_url IS 'URL de imagen para tablet de mesero. Puede ser null.';
COMMENT ON COLUMN catalog.products.estado IS 'borrador = en preparación; activo = disponible para venta.';

CREATE INDEX products_categoria_id_idx ON catalog.products (categoria_id);
CREATE INDEX products_estado_idx ON catalog.products (estado);

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON catalog.products
  FOR EACH ROW EXECUTE FUNCTION catalog.set_actualizado_en();

-- ── 5. Tabla: catalog.product_variants ──────────────────────
CREATE TABLE catalog.product_variants (
  id             UUID        NOT NULL DEFAULT gen_random_uuid(),
  product_id     UUID        NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
  nombre         TEXT        NOT NULL,
  precio_cop     BIGINT      NOT NULL CHECK (precio_cop > 0),
  receta_id      UUID,                -- FK a catalog.recipes, circular → se agrega abajo
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT product_variants_pkey PRIMARY KEY (id),
  CONSTRAINT product_variants_nombre_product_unique UNIQUE (nombre, product_id)
);

COMMENT ON TABLE catalog.product_variants IS 'Variantes de un producto (tamaño, presentación). Mín. 1 por producto.';
COMMENT ON COLUMN catalog.product_variants.precio_cop IS 'Precio de venta en COP. Siempre entero positivo.';
COMMENT ON COLUMN catalog.product_variants.receta_id IS 'NULL = variante de reventa (costo desde Inventory). NOT NULL = variante elaborada.';

CREATE INDEX product_variants_product_id_idx ON catalog.product_variants (product_id);
CREATE INDEX product_variants_receta_id_idx ON catalog.product_variants (receta_id) WHERE receta_id IS NOT NULL;

CREATE TRIGGER product_variants_updated_at
  BEFORE UPDATE ON catalog.product_variants
  FOR EACH ROW EXECUTE FUNCTION catalog.set_actualizado_en();

-- ── 6. Tabla: catalog.recipes ───────────────────────────────
CREATE TABLE catalog.recipes (
  id             UUID        NOT NULL DEFAULT gen_random_uuid(),
  variante_id    UUID        NOT NULL UNIQUE REFERENCES catalog.product_variants(id) ON DELETE CASCADE,
  version        INTEGER     NOT NULL DEFAULT 1 CHECK (version >= 1),
  actualizada_en TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT recipes_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE catalog.recipes IS 'Receta de composición de una variante elaborada. 1:1 con product_variants.';
COMMENT ON COLUMN catalog.recipes.variante_id IS 'Referencia única a la variante a la que pertenece la receta.';
COMMENT ON COLUMN catalog.recipes.version IS 'Versión monotónica, incrementa en cada actualización.';

-- FK circular: product_variants.receta_id → catalog.recipes
ALTER TABLE catalog.product_variants
  ADD CONSTRAINT product_variants_receta_id_fk
  FOREIGN KEY (receta_id) REFERENCES catalog.recipes(id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

-- ── 7. Tabla: catalog.recipe_lines ──────────────────────────
CREATE TABLE catalog.recipe_lines (
  id             UUID        NOT NULL DEFAULT gen_random_uuid(),
  recipe_id      UUID        NOT NULL REFERENCES catalog.recipes(id) ON DELETE CASCADE,
  ingredient_id  UUID        NOT NULL,                       -- referencia ACL al BC Inventory
  cantidad_valor NUMERIC(12,4) NOT NULL CHECK (cantidad_valor > 0),
  unidad         TEXT        NOT NULL,
  es_empaque     BOOLEAN     NOT NULL DEFAULT FALSE,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT recipe_lines_pkey PRIMARY KEY (id),
  CONSTRAINT recipe_lines_recipe_ingredient_unique UNIQUE (recipe_id, ingredient_id)
);

COMMENT ON TABLE catalog.recipe_lines IS 'Líneas de una receta. ingredient_id es referencia ACL opaca a inventory.ingredients.';
COMMENT ON COLUMN catalog.recipe_lines.ingredient_id IS 'UUID del ingrediente en BC Inventory. No hay FK para mantener independencia de BC.';
COMMENT ON COLUMN catalog.recipe_lines.es_empaque IS 'TRUE = es material de empaque (caja, bolsa, servilleta, etc.).';

CREATE INDEX recipe_lines_recipe_id_idx ON catalog.recipe_lines (recipe_id);
CREATE INDEX recipe_lines_ingredient_id_idx ON catalog.recipe_lines (ingredient_id);

-- ── 8. Tabla: catalog.combos ────────────────────────────────
CREATE TABLE catalog.combos (
  id             UUID        NOT NULL DEFAULT gen_random_uuid(),
  nombre         TEXT        NOT NULL,
  descripcion    TEXT        NOT NULL DEFAULT '',
  imagen_url     TEXT,
  precio_cop     BIGINT      NOT NULL CHECK (precio_cop >= 0),
  estado         TEXT        NOT NULL DEFAULT 'activo'
                             CHECK (estado IN ('activo', 'inactivo')),
  vigencia_desde TIMESTAMPTZ,
  vigencia_hasta TIMESTAMPTZ,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT combos_pkey PRIMARY KEY (id),
  CONSTRAINT combos_vigencia_coherente CHECK (
    vigencia_desde IS NULL
    OR vigencia_hasta IS NULL
    OR vigencia_desde <= vigencia_hasta
  )
);

COMMENT ON TABLE catalog.combos IS 'Combos y promociones. Los combos inactivos no aparecen en el menú de ventas.';

CREATE INDEX combos_estado_idx ON catalog.combos (estado);
CREATE INDEX combos_vigencia_idx ON catalog.combos (vigencia_desde, vigencia_hasta)
  WHERE vigencia_desde IS NOT NULL OR vigencia_hasta IS NOT NULL;

CREATE TRIGGER combos_updated_at
  BEFORE UPDATE ON catalog.combos
  FOR EACH ROW EXECUTE FUNCTION catalog.set_actualizado_en();

-- ── 9. Tabla: catalog.combo_items ────────────────────────────
CREATE TABLE catalog.combo_items (
  id                  UUID        NOT NULL DEFAULT gen_random_uuid(),
  combo_id            UUID        NOT NULL REFERENCES catalog.combos(id) ON DELETE CASCADE,
  product_variant_id  UUID        NOT NULL REFERENCES catalog.product_variants(id) ON DELETE RESTRICT,
  cantidad_valor      NUMERIC(12,4) NOT NULL CHECK (cantidad_valor > 0),
  unidad              TEXT        NOT NULL,

  CONSTRAINT combo_items_pkey PRIMARY KEY (id),
  CONSTRAINT combo_items_combo_variant_unique UNIQUE (combo_id, product_variant_id)
);

COMMENT ON TABLE catalog.combo_items IS 'Items que componen un combo. Una variante no puede repetirse en el mismo combo.';

CREATE INDEX combo_items_combo_id_idx ON catalog.combo_items (combo_id);
CREATE INDEX combo_items_variant_id_idx ON catalog.combo_items (product_variant_id);

-- ══════════════════════════════════════════════════════════════
-- RLS — Row Level Security
-- ══════════════════════════════════════════════════════════════

-- Habilitar RLS en todas las tablas
ALTER TABLE catalog.categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.recipes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.recipe_lines    ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.combos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.combo_items     ENABLE ROW LEVEL SECURITY;

-- ── Políticas: catalog.categories ───────────────────────────
-- Todos los roles autenticados pueden leer categorías activas (necesario para el menú).
CREATE POLICY categories_select_all ON catalog.categories
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY categories_write_admin ON catalog.categories
  FOR ALL TO authenticated
  USING   (identity.jwt_rol() IN ('SUPERADMIN', 'ADMIN'))
  WITH CHECK (identity.jwt_rol() IN ('SUPERADMIN', 'ADMIN'));

-- ── Políticas: catalog.products ─────────────────────────────
-- WORKER: solo productos activos.
CREATE POLICY products_select_worker ON catalog.products
  FOR SELECT TO authenticated
  USING (
    CASE identity.jwt_rol()
      WHEN 'WORKER' THEN estado = 'activo'
      ELSE true
    END
  );

CREATE POLICY products_write_admin ON catalog.products
  FOR ALL TO authenticated
  USING   (identity.jwt_rol() IN ('SUPERADMIN', 'ADMIN'))
  WITH CHECK (identity.jwt_rol() IN ('SUPERADMIN', 'ADMIN'));

-- ── Políticas: catalog.product_variants ─────────────────────
-- WORKER: solo variantes de productos activos.
CREATE POLICY product_variants_select_worker ON catalog.product_variants
  FOR SELECT TO authenticated
  USING (
    CASE identity.jwt_rol()
      WHEN 'WORKER' THEN EXISTS (
        SELECT 1 FROM catalog.products p
        WHERE p.id = product_id AND p.estado = 'activo'
      )
      ELSE true
    END
  );

CREATE POLICY product_variants_write_admin ON catalog.product_variants
  FOR ALL TO authenticated
  USING   (identity.jwt_rol() IN ('SUPERADMIN', 'ADMIN'))
  WITH CHECK (identity.jwt_rol() IN ('SUPERADMIN', 'ADMIN'));

-- ── Políticas: catalog.recipes (RESTRINGIDO) ─────────────────
-- WORKER no puede ver recetas — contienen información de composición
-- usada para calcular costos y márgenes.
CREATE POLICY recipes_select_admin ON catalog.recipes
  FOR SELECT TO authenticated
  USING (identity.jwt_rol() IN ('SUPERADMIN', 'ADMIN'));

CREATE POLICY recipes_write_admin ON catalog.recipes
  FOR ALL TO authenticated
  USING   (identity.jwt_rol() IN ('SUPERADMIN', 'ADMIN'))
  WITH CHECK (identity.jwt_rol() IN ('SUPERADMIN', 'ADMIN'));

-- ── Políticas: catalog.recipe_lines (RESTRINGIDO) ────────────
CREATE POLICY recipe_lines_select_admin ON catalog.recipe_lines
  FOR SELECT TO authenticated
  USING (identity.jwt_rol() IN ('SUPERADMIN', 'ADMIN'));

CREATE POLICY recipe_lines_write_admin ON catalog.recipe_lines
  FOR ALL TO authenticated
  USING   (identity.jwt_rol() IN ('SUPERADMIN', 'ADMIN'))
  WITH CHECK (identity.jwt_rol() IN ('SUPERADMIN', 'ADMIN'));

-- ── Políticas: catalog.combos ────────────────────────────────
-- WORKER: solo combos activos y vigentes.
CREATE POLICY combos_select_worker ON catalog.combos
  FOR SELECT TO authenticated
  USING (
    CASE identity.jwt_rol()
      WHEN 'WORKER' THEN estado = 'activo'
      ELSE true
    END
  );

CREATE POLICY combos_write_admin ON catalog.combos
  FOR ALL TO authenticated
  USING   (identity.jwt_rol() IN ('SUPERADMIN', 'ADMIN'))
  WITH CHECK (identity.jwt_rol() IN ('SUPERADMIN', 'ADMIN'));

-- ── Políticas: catalog.combo_items ──────────────────────────
CREATE POLICY combo_items_select_worker ON catalog.combo_items
  FOR SELECT TO authenticated
  USING (
    CASE identity.jwt_rol()
      WHEN 'WORKER' THEN EXISTS (
        SELECT 1 FROM catalog.combos c
        WHERE c.id = combo_id AND c.estado = 'activo'
      )
      ELSE true
    END
  );

CREATE POLICY combo_items_write_admin ON catalog.combo_items
  FOR ALL TO authenticated
  USING   (identity.jwt_rol() IN ('SUPERADMIN', 'ADMIN'))
  WITH CHECK (identity.jwt_rol() IN ('SUPERADMIN', 'ADMIN'));

-- ── Fin de migración ─────────────────────────────────────────
