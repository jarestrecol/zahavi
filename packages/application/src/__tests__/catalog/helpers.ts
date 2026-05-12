import { vi } from 'vitest';
import {
  Product,
  Category,
  Recipe,
  Combo,
  ProductId,
  ProductVariantId,
  CategoryId,
  RecipeId,
  RecipeLineId,
  ComboId,
  ComboItemId,
  IngredientId,
  NombreDeCatalogo,
  Money,
  Cantidad,
  FechaHora,
  ProductVariant,
  RecipeLine,
  ComboItem,
  ok,
  DomainError,
  type Result,
} from '@zahavi/domain-catalog';
import type {
  IProductRepository,
  ICategoryRepository,
  IRecipeRepository,
  IComboRepository,
  IPublicadorDeDomainEventsCatalog,
  IConsultorDeCostosDeIngredientes,
} from '@zahavi/ports';

function unwrap<T>(result: Result<T, DomainError>): T {
  if (!result.ok) throw new Error(`unwrap en test falló: ${result.error.message}`);
  return result.value;
}

// ── UUIDs fijos para tests ────────────────────────────────────────

export const UUID_PRODUCTO = '00000000-0000-0000-0000-000000000001';
export const UUID_VARIANTE = '00000000-0000-0000-0000-000000000002';
export const UUID_CATEGORIA = '00000000-0000-0000-0000-000000000003';
export const UUID_CATEGORIA_PADRE = '00000000-0000-0000-0000-000000000004';
export const UUID_RECETA = '00000000-0000-0000-0000-000000000005';
export const UUID_LINEA = '00000000-0000-0000-0000-000000000006';
export const UUID_INGREDIENTE = '00000000-0000-0000-0000-000000000007';
export const UUID_COMBO = '00000000-0000-0000-0000-000000000008';
export const UUID_COMBO_ITEM = '00000000-0000-0000-0000-000000000009';
export const UUID_EVENTO = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
export const UUID_CORRELACION = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

export const AHORA = FechaHora.deTimestamp(1_700_000_000_000);

// ── Factories de aggregates ───────────────────────────────────────

export function createTestCategory(
  overrides: {
    id?: string;
    nombre?: string;
    padreId?: string | null;
    orden?: number;
    estado?: 'activa' | 'archivada';
  } = {},
): Category {
  const idRes = CategoryId.of(overrides.id ?? UUID_CATEGORIA);
  if (!idRes.ok) throw new Error(idRes.error.message);

  const nombreRes = NombreDeCatalogo.of(overrides.nombre ?? 'Panadería');
  if (!nombreRes.ok) throw new Error(nombreRes.error.message);

  let padreId: CategoryId | null = null;
  if (overrides.padreId !== undefined && overrides.padreId !== null) {
    const r = CategoryId.of(overrides.padreId);
    if (!r.ok) throw new Error(r.error.message);
    padreId = r.value;
  } else if (overrides.padreId === null) {
    padreId = null;
  }

  return Category.reconstituir({
    id: idRes.value,
    nombre: nombreRes.value,
    padreId,
    orden: overrides.orden ?? 0,
    estado: overrides.estado ?? 'activa',
  });
}

export function createTestVariant(
  overrides: {
    id?: string;
    nombre?: string;
    precioCop?: number;
    recetaId?: string | null;
  } = {},
): ProductVariant {
  const idRes = ProductVariantId.of(overrides.id ?? UUID_VARIANTE);
  if (!idRes.ok) throw new Error(idRes.error.message);

  const nombreRes = NombreDeCatalogo.of(overrides.nombre ?? 'Mediano');
  if (!nombreRes.ok) throw new Error(nombreRes.error.message);

  const moneyRes = Money.deCop(overrides.precioCop ?? 3000);
  if (!moneyRes.ok) throw new Error(moneyRes.error.message);

  let recetaId: import('@zahavi/domain-catalog').RecipeId | null = null;
  if (overrides.recetaId !== undefined && overrides.recetaId !== null) {
    const r = RecipeId.of(overrides.recetaId);
    if (!r.ok) throw new Error(r.error.message);
    recetaId = r.value;
  }

  return ProductVariant.reconstituir({
    id: idRes.value,
    nombre: nombreRes.value,
    precio: moneyRes.value,
    recetaId,
  });
}

export function createTestProduct(
  overrides: {
    id?: string;
    nombre?: string;
    categoriaId?: string;
    imagenUrl?: string | null;
    estado?: 'borrador' | 'activo';
    varianteRecetaId?: string | null;
    variantePrecioCop?: number;
  } = {},
): Product {
  const idRes = ProductId.of(overrides.id ?? UUID_PRODUCTO);
  if (!idRes.ok) throw new Error(idRes.error.message);

  const nombreRes = NombreDeCatalogo.of(overrides.nombre ?? 'Pan Frances');
  if (!nombreRes.ok) throw new Error(nombreRes.error.message);

  const catIdRes = CategoryId.of(overrides.categoriaId ?? UUID_CATEGORIA);
  if (!catIdRes.ok) throw new Error(catIdRes.error.message);

  const varianteOpts: Parameters<typeof createTestVariant>[0] = {
    recetaId: overrides.varianteRecetaId !== undefined ? overrides.varianteRecetaId : null,
  };
  if (overrides.variantePrecioCop !== undefined) {
    varianteOpts.precioCop = overrides.variantePrecioCop;
  }
  const variante = createTestVariant(varianteOpts);

  return Product.reconstituir({
    id: idRes.value,
    nombre: nombreRes.value,
    categoriaId: catIdRes.value,
    imagenUrl: overrides.imagenUrl ?? null,
    variantes: [variante],
    estado: overrides.estado ?? 'borrador',
    creadoEn: AHORA,
  });
}

export function createTestRecipeLine(
  overrides: {
    id?: string;
    ingredientId?: string;
    cantidadValor?: number;
    unidad?: import('@zahavi/domain-catalog').Unidad;
    esEmpaque?: boolean;
  } = {},
): RecipeLine {
  const idRes = RecipeLineId.of(overrides.id ?? UUID_LINEA);
  if (!idRes.ok) throw new Error(idRes.error.message);

  const ingRes = IngredientId.of(overrides.ingredientId ?? UUID_INGREDIENTE);
  if (!ingRes.ok) throw new Error(ingRes.error.message);

  const cantRes = Cantidad.de(overrides.cantidadValor ?? 100, overrides.unidad ?? 'gramo');
  if (!cantRes.ok) throw new Error(cantRes.error.message);

  return RecipeLine.crear({
    id: idRes.value,
    ingredientId: ingRes.value,
    cantidad: cantRes.value,
    esEmpaque: overrides.esEmpaque ?? false,
  });
}

export function createTestRecipe(
  overrides: {
    id?: string;
    varianteId?: string;
    lineas?: RecipeLine[];
  } = {},
): Recipe {
  const idRes = RecipeId.of(overrides.id ?? UUID_RECETA);
  if (!idRes.ok) throw new Error(idRes.error.message);

  const varRes = ProductVariantId.of(overrides.varianteId ?? UUID_VARIANTE);
  if (!varRes.ok) throw new Error(varRes.error.message);

  const lineas = overrides.lineas ?? [createTestRecipeLine()];

  return Recipe.reconstituir({
    id: idRes.value,
    varianteId: varRes.value,
    lineas,
    version: 1,
    actualizadaEn: AHORA,
  });
}

export function createTestComboItem(
  overrides: {
    id?: string;
    productVariantId?: string;
    cantidadValor?: number;
  } = {},
): ComboItem {
  const idRes = ComboItemId.of(overrides.id ?? UUID_COMBO_ITEM);
  if (!idRes.ok) throw new Error(idRes.error.message);

  const varRes = ProductVariantId.of(overrides.productVariantId ?? UUID_VARIANTE);
  if (!varRes.ok) throw new Error(varRes.error.message);

  const cantRes = Cantidad.de(overrides.cantidadValor ?? 1, 'unidad');
  if (!cantRes.ok) throw new Error(cantRes.error.message);

  return ComboItem.crear({
    id: idRes.value,
    productVariantId: varRes.value,
    cantidad: cantRes.value,
  });
}

export function createTestCombo(
  overrides: {
    id?: string;
    nombre?: string;
    precioCop?: number;
    estado?: 'activo' | 'inactivo';
    items?: ComboItem[];
  } = {},
): Combo {
  const idRes = ComboId.of(overrides.id ?? UUID_COMBO);
  if (!idRes.ok) throw new Error(idRes.error.message);

  const nombreRes = NombreDeCatalogo.of(overrides.nombre ?? 'Combo Desayuno');
  if (!nombreRes.ok) throw new Error(nombreRes.error.message);

  const moneyRes = Money.deCop(overrides.precioCop ?? 8000);
  if (!moneyRes.ok) throw new Error(moneyRes.error.message);

  const items = overrides.items ?? [createTestComboItem()];

  return Combo.reconstituir({
    id: idRes.value,
    nombre: nombreRes.value,
    descripcion: 'Combo de prueba',
    imagenUrl: null,
    precio: moneyRes.value,
    items,
    estado: overrides.estado ?? 'activo',
    vigenciaDesde: null,
    vigenciaHasta: null,
    creadoEn: AHORA,
  });
}

// ── Mocks de repositorios ─────────────────────────────────────────

export function makeMockProductRepo(
  overrides: Partial<IProductRepository> = {},
): IProductRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    getById: vi.fn().mockResolvedValue(null),
    getByCategoryId: vi.fn().mockResolvedValue([]),
    getByNameInCategory: vi.fn().mockResolvedValue(null),
    getActive: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

export function makeMockCategoryRepo(
  overrides: Partial<ICategoryRepository> = {},
): ICategoryRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    getById: vi.fn().mockResolvedValue(null),
    getRoots: vi.fn().mockResolvedValue([]),
    getByParentId: vi.fn().mockResolvedValue([]),
    getDepth: vi.fn().mockResolvedValue(-1),
    getAncestors: vi.fn().mockResolvedValue([]),
    hasActiveProducts: vi.fn().mockResolvedValue(false),
    update: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

export function makeMockRecipeRepo(
  overrides: Partial<IRecipeRepository> = {},
): IRecipeRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    getById: vi.fn().mockResolvedValue(null),
    getByVariantId: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(undefined),
    getByProductId: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

export function makeMockComboRepo(
  overrides: Partial<IComboRepository> = {},
): IComboRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    getById: vi.fn().mockResolvedValue(null),
    getActiveAndVigenteAt: vi.fn().mockResolvedValue([]),
    getActive: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

export function makeMockPublicador(
  overrides: Partial<IPublicadorDeDomainEventsCatalog> = {},
): IPublicadorDeDomainEventsCatalog {
  return {
    publicar: vi.fn().mockResolvedValue(undefined),
    publicarLote: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

export function makeMockConsultorCostos(
  costosMap: Record<string, number> = {},
): IConsultorDeCostosDeIngredientes {
  return {
    obtenerCostosParaReceta: vi.fn().mockImplementation(async () => {
      const map = new Map<string, Money>();
      for (const [id, cop] of Object.entries(costosMap)) {
        const res = Money.deCop(cop);
        if (res.ok) map.set(id, res.value);
      }
      return map as ReadonlyMap<string, Money>;
    }),
  };
}
