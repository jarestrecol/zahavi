import { describe, it, expect, vi } from 'vitest';
import { CrearProducto } from '../../catalog/CrearProducto.js';
import {
  makeMockProductRepo,
  makeMockCategoryRepo,
  makeMockPublicador,
  createTestCategory,
  UUID_CATEGORIA,
  UUID_CORRELACION,
} from './helpers.js';

function makeUseCase(
  overrides: {
    productOverride?: Parameters<typeof makeMockProductRepo>[0];
    categoryOverride?: Parameters<typeof makeMockCategoryRepo>[0];
  } = {},
) {
  const productRepo = makeMockProductRepo(overrides.productOverride);
  const categoryRepo = makeMockCategoryRepo({
    getById: vi.fn().mockResolvedValue(createTestCategory()),
    getByParentId: vi.fn().mockResolvedValue([]),
    ...overrides.categoryOverride,
  });
  const publicador = makeMockPublicador();
  const uc = new CrearProducto(productRepo, categoryRepo, publicador);
  return { uc, productRepo, categoryRepo, publicador };
}

const entradaBase = {
  nombre: 'Pan Frances',
  categoriaId: UUID_CATEGORIA,
  imagenUrl: null,
  varianteInicial: { nombre: 'Unidad', precioCop: 1500 },
  actorRol: 'ADMIN' as const,
  correlacionId: UUID_CORRELACION,
};

describe('CrearProducto', () => {
  it('crea producto exitosamente con rol ADMIN', async () => {
    const { uc, productRepo, publicador } = makeUseCase();

    const result = await uc.execute(entradaBase);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.productoId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(result.value.varianteId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(productRepo.save).toHaveBeenCalledOnce();
    expect(publicador.publicar).toHaveBeenCalledOnce();
  });

  it('crea producto exitosamente con rol SUPERADMIN', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, actorRol: 'SUPERADMIN' });
    expect(result.ok).toBe(true);
  });

  it('falla con rol WORKER', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, actorRol: 'WORKER' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CATALOG_ROL_NO_AUTORIZADO');
  });

  it('falla si categoría no existe', async () => {
    const { uc } = makeUseCase({
      categoryOverride: { getById: vi.fn().mockResolvedValue(null) },
    });
    const result = await uc.execute(entradaBase);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CATALOG_CATEGORIA_NO_ENCONTRADA');
  });

  it('falla si categoría tiene subcategorías (no es hoja)', async () => {
    const { uc } = makeUseCase({
      categoryOverride: {
        getById: vi.fn().mockResolvedValue(createTestCategory()),
        getByParentId: vi.fn().mockResolvedValue([createTestCategory({ id: '00000000-0000-0000-0000-000000000099' })]),
      },
    });
    const result = await uc.execute(entradaBase);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CATALOG_CATEGORIA_NO_HOJA');
  });

  it('falla con nombre vacío', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, nombre: '' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CATALOG_NOMBRE_INVALIDO');
  });

  it('falla con precio de variante inválido (negativo)', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({
      ...entradaBase,
      varianteInicial: { nombre: 'Unidad', precioCop: -100 },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    // Money rechaza negativos con SHARED_MONEY_INVALIDO
    expect(result.error.message).toMatch(/negativo|inválido|invalido/i);
  });

  it('publica evento ProductoCreado', async () => {
    const { uc, publicador } = makeUseCase();
    await uc.execute(entradaBase);
    expect(publicador.publicar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'ProductoCreado' }),
      UUID_CORRELACION,
    );
  });

  it('no guarda ni publica si la categoría no existe (efecto nulo)', async () => {
    const { uc, productRepo, publicador } = makeUseCase({
      categoryOverride: { getById: vi.fn().mockResolvedValue(null) },
    });
    await uc.execute(entradaBase);
    expect(productRepo.save).not.toHaveBeenCalled();
    expect(publicador.publicar).not.toHaveBeenCalled();
  });
});
