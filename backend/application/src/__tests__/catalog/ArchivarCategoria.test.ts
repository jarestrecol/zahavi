import { describe, it, expect, vi } from 'vitest';
import { ArchivarCategoria } from '../../catalog/ArchivarCategoria.js';
import {
  makeMockCategoryRepo,
  makeMockPublicador,
  createTestCategory,
  UUID_CATEGORIA,
  UUID_CORRELACION,
} from './helpers.js';

function makeUseCase(
  overrides: {
    categoryOverride?: Parameters<typeof makeMockCategoryRepo>[0];
  } = {},
) {
  const categoryRepo = makeMockCategoryRepo({
    getById: vi.fn().mockResolvedValue(createTestCategory({ estado: 'activa' })),
    hasActiveProducts: vi.fn().mockResolvedValue(false),
    ...overrides.categoryOverride,
  });
  const publicador = makeMockPublicador();
  const uc = new ArchivarCategoria(categoryRepo, publicador);
  return { uc, categoryRepo, publicador };
}

const entradaBase = {
  categoriaId: UUID_CATEGORIA,
  actorRol: 'ADMIN',
  correlacionId: UUID_CORRELACION,
};

describe('ArchivarCategoria', () => {
  it('archiva una categoría activa sin productos activos', async () => {
    const { uc, categoryRepo, publicador } = makeUseCase();
    const result = await uc.execute(entradaBase);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.estado).toBe('archivada');
    expect(categoryRepo.update).toHaveBeenCalledOnce();
    expect(publicador.publicar).toHaveBeenCalledOnce();
  });

  it('publica evento CategoriaArchivada', async () => {
    const { uc, publicador } = makeUseCase();
    await uc.execute(entradaBase);
    expect(publicador.publicar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'CategoriaArchivada' }),
      UUID_CORRELACION,
    );
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

  it('falla si categoría tiene productos activos', async () => {
    const { uc } = makeUseCase({
      categoryOverride: { hasActiveProducts: vi.fn().mockResolvedValue(true) },
    });
    const result = await uc.execute(entradaBase);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CATALOG_CATEGORIA_CON_PRODUCTOS');
  });

  it('falla si categoría ya está archivada', async () => {
    const { uc } = makeUseCase({
      categoryOverride: {
        getById: vi.fn().mockResolvedValue(createTestCategory({ estado: 'archivada' })),
      },
    });
    const result = await uc.execute(entradaBase);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CATALOG_CATEGORIA_YA_EN_ESTADO');
  });

  it('falla con categoriaId UUID inválido', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, categoriaId: 'mal-formato' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CATALOG_ID_INVALIDO');
  });
});
