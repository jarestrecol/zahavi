import { describe, it, expect, vi } from 'vitest';
import { CrearReceta } from '../../catalog/CrearReceta.js';
import {
  makeMockProductRepo,
  makeMockRecipeRepo,
  makeMockPublicador,
  createTestProduct,
  UUID_PRODUCTO,
  UUID_VARIANTE,
  UUID_INGREDIENTE,
  UUID_CORRELACION,
} from './helpers.js';

const lineaBase = {
  ingredientId: UUID_INGREDIENTE,
  cantidadValor: 200,
  unidad: 'gramo',
  esEmpaque: false,
};

const entradaBase = {
  varianteId: UUID_VARIANTE,
  productoId: UUID_PRODUCTO,
  lineas: [lineaBase],
  actorRol: 'ADMIN' as const,
  correlacionId: UUID_CORRELACION,
};

function makeUseCase(
  overrides: {
    productOverride?: Parameters<typeof makeMockProductRepo>[0];
    recipeOverride?: Parameters<typeof makeMockRecipeRepo>[0];
  } = {},
) {
  const productRepo = makeMockProductRepo({
    getById: vi.fn().mockResolvedValue(createTestProduct({ varianteRecetaId: null })),
    ...overrides.productOverride,
  });
  const recipeRepo = makeMockRecipeRepo(overrides.recipeOverride);
  const publicador = makeMockPublicador();
  const uc = new CrearReceta(productRepo, recipeRepo, publicador);
  return { uc, productRepo, recipeRepo, publicador };
}

describe('CrearReceta', () => {
  it('crea receta exitosamente con una línea', async () => {
    const { uc, recipeRepo } = makeUseCase();
    const result = await uc.execute(entradaBase);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.recetaId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(result.value.cantidadDeLineas).toBe(1);
    expect(recipeRepo.save).toHaveBeenCalledOnce();
  });

  it('vincula la receta al producto y lo actualiza', async () => {
    const { uc, productRepo } = makeUseCase();
    await uc.execute(entradaBase);
    expect(productRepo.update).toHaveBeenCalledOnce();
  });

  it('publica evento RecetaCreada y RecetaVinculadaAVariante', async () => {
    const { uc, publicador } = makeUseCase();
    await uc.execute(entradaBase);
    const llamadas = (publicador.publicar as ReturnType<typeof vi.fn>).mock.calls.map(
      (c: unknown[]) => (c[0] as { tipo: string }).tipo,
    );
    expect(llamadas).toContain('RecetaCreada');
    expect(llamadas).toContain('RecetaVinculadaAVariante');
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

  it('falla si variante no existe en el producto', async () => {
    const { uc } = makeUseCase({
      productOverride: {
        getById: vi.fn().mockResolvedValue(createTestProduct({ id: UUID_PRODUCTO })),
      },
    });
    const result = await uc.execute({
      ...entradaBase,
      varianteId: '00000000-0000-0000-0000-000000000099',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CATALOG_VARIANTE_NO_ENCONTRADA');
  });

  it('falla si la variante ya tiene receta vinculada', async () => {
    const { uc } = makeUseCase({
      productOverride: {
        getById: vi
          .fn()
          .mockResolvedValue(
            createTestProduct({ varianteRecetaId: '00000000-0000-0000-0000-000000000005' }),
          ),
      },
    });
    const result = await uc.execute(entradaBase);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CATALOG_RECETA_YA_EXISTE');
  });

  it('falla con cantidad de ingrediente igual a cero', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({
      ...entradaBase,
      lineas: [{ ...lineaBase, cantidadValor: 0 }],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CATALOG_CANTIDAD_INVALIDA');
  });
});
