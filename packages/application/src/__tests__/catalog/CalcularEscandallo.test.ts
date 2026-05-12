import { describe, it, expect, vi } from 'vitest';
import { CalcularEscandallo } from '../../catalog/CalcularEscandallo.js';
import {
  makeMockProductRepo,
  makeMockRecipeRepo,
  makeMockConsultorCostos,
  createTestProduct,
  createTestRecipe,
  UUID_PRODUCTO,
  UUID_VARIANTE,
  UUID_RECETA,
  UUID_INGREDIENTE,
  UUID_CORRELACION,
} from './helpers.js';

const PRECIO_VENTA = 3000;
const COSTO_INGREDIENTE = 1000;

function makeUseCase(
  overrides: {
    productOverride?: Parameters<typeof makeMockProductRepo>[0];
    recipeOverride?: Parameters<typeof makeMockRecipeRepo>[0];
    costos?: Record<string, number>;
  } = {},
) {
  const productRepo = makeMockProductRepo({
    getById: vi.fn().mockResolvedValue(
      createTestProduct({
        varianteRecetaId: UUID_RECETA,
        variantePrecioCop: PRECIO_VENTA,
      }),
    ),
    ...overrides.productOverride,
  });
  const recipeRepo = makeMockRecipeRepo({
    getByVariantId: vi.fn().mockResolvedValue(createTestRecipe()),
    ...overrides.recipeOverride,
  });
  const consultorCostos = makeMockConsultorCostos(
    overrides.costos ?? { [UUID_INGREDIENTE]: COSTO_INGREDIENTE },
  );
  const uc = new CalcularEscandallo(productRepo, recipeRepo, consultorCostos);
  return { uc, productRepo, recipeRepo, consultorCostos };
}

const entradaBase = {
  productoId: UUID_PRODUCTO,
  varianteId: UUID_VARIANTE,
  actorRol: 'ADMIN' as const,
  correlacionId: UUID_CORRELACION,
};

describe('CalcularEscandallo', () => {
  it('falla cuando el costo supera al precio de venta (margen negativo)', async () => {
    // fixture: 100 gramos × 1000 COP/gramo = 100_000 COP de costo; precio = 3_000
    // Catalog rechaza margen negativo con MoneyInvalidoError
    const { uc } = makeUseCase();
    const result = await uc.execute(entradaBase);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/supera|costo|negativo/i);
  });

  it('calcula correctamente cuando costo es menor al precio', async () => {
    const { uc } = makeUseCase({ costos: { [UUID_INGREDIENTE]: 5 } });
    // cantidad = 100, costo unitario = 5 → costo total = 500; precio = 3000
    const result = await uc.execute(entradaBase);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.costoUnitarioCop).toBe(500);
    expect(result.value.precioVentaCop).toBe(PRECIO_VENTA);
    expect(result.value.margenMontoCop).toBe(2500);
    expect(result.value.margenPorcentaje).toBeCloseTo(83.33, 1);
  });

  it('falla con rol WORKER', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, actorRol: 'WORKER' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CATALOG_ROL_NO_AUTORIZADO');
  });

  it('falla si producto no existe', async () => {
    const { uc } = makeUseCase({
      productOverride: { getById: vi.fn().mockResolvedValue(null) },
    });
    const result = await uc.execute(entradaBase);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CATALOG_PRODUCTO_NO_ENCONTRADO');
  });

  it('falla si variante no tiene receta (recetaId null)', async () => {
    const { uc } = makeUseCase({
      productOverride: {
        getById: vi.fn().mockResolvedValue(createTestProduct({ varianteRecetaId: null })),
      },
    });
    const result = await uc.execute(entradaBase);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CATALOG_RECETA_NO_ENCONTRADA');
  });

  it('falla si la receta no se encuentra en el repositorio', async () => {
    const { uc } = makeUseCase({
      recipeOverride: { getByVariantId: vi.fn().mockResolvedValue(null) },
    });
    const result = await uc.execute(entradaBase);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CATALOG_RECETA_NO_ENCONTRADA');
  });

  it('falla si algún costo de ingrediente no está disponible', async () => {
    const { uc } = makeUseCase({ costos: {} });
    // costos vacío → CostoIngredienteNoDisponibleError
    const result = await uc.execute(entradaBase);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CATALOG_COSTO_INGREDIENTE_NO_DISPONIBLE');
  });
});
