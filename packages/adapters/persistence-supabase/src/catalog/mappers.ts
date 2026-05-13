import {
  Category,
  CategoryId,
  Product,
  ProductId,
  ProductVariant,
  ProductVariantId,
  Recipe,
  RecipeId,
  RecipeLine,
  RecipeLineId,
  Combo,
  ComboId,
  ComboItem,
  ComboItemId,
  IngredientId,
  NombreDeCatalogo,
  Money,
  Cantidad,
  FechaHora,
} from '@zahavi/domain-catalog';
import type { Selectable } from 'kysely';
import type {
  CatalogCategoriesTable,
  CatalogProductsTable,
  CatalogProductVariantsTable,
  CatalogRecipesTable,
  CatalogRecipeLinesTable,
  CatalogCombosTable,
  CatalogComboItemsTable,
} from './schema.js';

type CategoryRow = Selectable<CatalogCategoriesTable>;
type ProductRow = Selectable<CatalogProductsTable>;
type VariantRow = Selectable<CatalogProductVariantsTable>;
type RecipeRow = Selectable<CatalogRecipesTable>;
type RecipeLineRow = Selectable<CatalogRecipeLinesTable>;
type ComboRow = Selectable<CatalogCombosTable>;
type ComboItemRow = Selectable<CatalogComboItemsTable>;

function toFechaHora(date: Date): FechaHora {
  return FechaHora.deTimestamp(date.getTime());
}

function unwrap<T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!r.ok) throw new Error(`Mapper falló: ${JSON.stringify(r.error)}`);
  return r.value;
}

export function rowToCategory(row: CategoryRow): Category {
  const id = unwrap(CategoryId.of(row.id));
  const nombre = unwrap(NombreDeCatalogo.of(row.nombre));
  const padreId = row.padre_id ? unwrap(CategoryId.of(row.padre_id)) : null;

  return Category.reconstituir({
    id,
    nombre,
    padreId,
    orden: row.orden,
    estado: row.estado as 'activa' | 'archivada',
  });
}

export function categoryToRow(
  cat: Category,
): Omit<CategoryRow, 'creado_en' | 'actualizado_en'> & {
  creado_en: string;
  actualizado_en: string;
} {
  return {
    id: cat.id.toString(),
    nombre: cat.nombre.toString(),
    padre_id: cat.padreId?.toString() ?? null,
    orden: cat.orden,
    estado: cat.estado,
    creado_en: new Date().toISOString(),
    actualizado_en: new Date().toISOString(),
  };
}

export function rowToVariant(row: VariantRow): ProductVariant {
  const id = unwrap(ProductVariantId.of(row.id));
  const nombre = unwrap(NombreDeCatalogo.of(row.nombre));
  const precio = unwrap(Money.deCop(row.precio_cop));
  const recetaId = row.receta_id ? unwrap(RecipeId.of(row.receta_id)) : null;

  return ProductVariant.reconstituir({ id, nombre, precio, recetaId });
}

export function rowToProduct(row: ProductRow, variants: VariantRow[]): Product {
  const id = unwrap(ProductId.of(row.id));
  const nombre = unwrap(NombreDeCatalogo.of(row.nombre));
  const categoriaId = unwrap(CategoryId.of(row.categoria_id));

  return Product.reconstituir({
    id,
    nombre,
    categoriaId,
    imagenUrl: row.imagen_url,
    variantes: variants.map(rowToVariant),
    estado: row.estado as 'borrador' | 'activo',
    creadoEn: toFechaHora(row.creado_en as unknown as Date),
  });
}

export function productToRows(product: Product): {
  product: Omit<ProductRow, 'creado_en' | 'actualizado_en'> & {
    creado_en: string;
    actualizado_en: string;
  };
  variants: Array<
    Omit<VariantRow, 'creado_en' | 'actualizado_en'> & { creado_en: string; actualizado_en: string }
  >;
} {
  return {
    product: {
      id: product.id.toString(),
      nombre: product.nombre.toString(),
      categoria_id: product.categoriaId.toString(),
      imagen_url: product.imagenUrl,
      estado: product.estado,
      creado_en: product.creadoEn.toISOString(),
      actualizado_en: new Date().toISOString(),
    },
    variants: product.variantes.map((v) => ({
      id: v.id.toString(),
      product_id: product.id.toString(),
      nombre: v.nombre.toString(),
      precio_cop: v.precio.toCop(),
      receta_id: v.recetaId?.toString() ?? null,
      creado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
    })),
  };
}

export function rowToRecipeLine(row: RecipeLineRow): RecipeLine {
  const id = unwrap(RecipeLineId.of(row.id));
  const ingredientId = unwrap(IngredientId.of(row.ingredient_id));
  const cantidad = unwrap(
    Cantidad.de(Number(row.cantidad_valor), row.unidad as import('@zahavi/domain-catalog').Unidad),
  );

  return RecipeLine.crear({ id, ingredientId, cantidad, esEmpaque: row.es_empaque });
}

export function rowToRecipe(row: RecipeRow, lines: RecipeLineRow[]): Recipe {
  const id = unwrap(RecipeId.of(row.id));
  const varianteId = unwrap(ProductVariantId.of(row.variante_id));

  return Recipe.reconstituir({
    id,
    varianteId,
    lineas: lines.map(rowToRecipeLine),
    version: row.version,
    actualizadaEn: toFechaHora(row.actualizada_en as unknown as Date),
  });
}

export function rowToComboItem(row: ComboItemRow): ComboItem {
  const id = unwrap(ComboItemId.of(row.id));
  const productVariantId = unwrap(ProductVariantId.of(row.product_variant_id));
  const cantidad = unwrap(
    Cantidad.de(Number(row.cantidad_valor), row.unidad as import('@zahavi/domain-catalog').Unidad),
  );

  return ComboItem.crear({ id, productVariantId, cantidad });
}

export function rowToCombo(row: ComboRow, items: ComboItemRow[]): Combo {
  const id = unwrap(ComboId.of(row.id));
  const nombre = unwrap(NombreDeCatalogo.of(row.nombre));
  const precio = unwrap(Money.deCop(row.precio_cop));

  return Combo.reconstituir({
    id,
    nombre,
    descripcion: row.descripcion,
    imagenUrl: row.imagen_url,
    precio,
    items: items.map(rowToComboItem),
    estado: row.estado as 'activo' | 'inactivo',
    vigenciaDesde: row.vigencia_desde ? toFechaHora(row.vigencia_desde as unknown as Date) : null,
    vigenciaHasta: row.vigencia_hasta ? toFechaHora(row.vigencia_hasta as unknown as Date) : null,
    creadoEn: toFechaHora(row.creado_en as unknown as Date),
  });
}
