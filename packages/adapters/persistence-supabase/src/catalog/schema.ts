import type { ColumnType } from 'kysely';

type Timestamp = ColumnType<Date, string, string>;
type NullableTimestamp = ColumnType<Date | null, string | null, string | null>;

export interface CatalogCategoriesTable {
  id: string;
  nombre: string;
  padre_id: string | null;
  orden: number;
  estado: string;
  creado_en: Timestamp;
  actualizado_en: Timestamp;
}

export interface CatalogProductsTable {
  id: string;
  nombre: string;
  categoria_id: string;
  imagen_url: string | null;
  estado: string;
  creado_en: Timestamp;
  actualizado_en: Timestamp;
}

export interface CatalogProductVariantsTable {
  id: string;
  product_id: string;
  nombre: string;
  precio_cop: number;
  receta_id: string | null;
  creado_en: Timestamp;
  actualizado_en: Timestamp;
}

export interface CatalogRecipesTable {
  id: string;
  variante_id: string;
  version: number;
  actualizada_en: Timestamp;
}

export interface CatalogRecipeLinesTable {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  cantidad_valor: number;
  unidad: string;
  es_empaque: boolean;
  creado_en: Timestamp;
}

export interface CatalogCombosTable {
  id: string;
  nombre: string;
  descripcion: string;
  imagen_url: string | null;
  precio_cop: number;
  estado: string;
  vigencia_desde: NullableTimestamp;
  vigencia_hasta: NullableTimestamp;
  creado_en: Timestamp;
  actualizado_en: Timestamp;
}

export interface CatalogComboItemsTable {
  id: string;
  combo_id: string;
  product_variant_id: string;
  cantidad_valor: number;
  unidad: string;
}

export interface CatalogDatabase {
  'catalog.categories': CatalogCategoriesTable;
  'catalog.products': CatalogProductsTable;
  'catalog.product_variants': CatalogProductVariantsTable;
  'catalog.recipes': CatalogRecipesTable;
  'catalog.recipe_lines': CatalogRecipeLinesTable;
  'catalog.combos': CatalogCombosTable;
  'catalog.combo_items': CatalogComboItemsTable;
}
