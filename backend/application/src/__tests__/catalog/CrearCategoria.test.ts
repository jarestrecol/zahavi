import { describe, it, expect, vi } from 'vitest';
import { CrearCategoria } from '../../catalog/CrearCategoria.js';
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
  const categoryRepo = makeMockCategoryRepo(overrides.categoryOverride);
  const publicador = makeMockPublicador();
  const uc = new CrearCategoria(categoryRepo, publicador);
  return { uc, categoryRepo, publicador };
}

const entradaRaiz = {
  nombre: 'Panadería',
  padreId: null,
  orden: 0,
  actorRol: 'ADMIN' as const,
  correlacionId: UUID_CORRELACION,
};

describe('CrearCategoria', () => {
  it('crea categoría raíz exitosamente', async () => {
    const { uc, categoryRepo, publicador } = makeUseCase();
    const result = await uc.execute(entradaRaiz);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.categoriaId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(categoryRepo.save).toHaveBeenCalledOnce();
    expect(publicador.publicar).toHaveBeenCalledOnce();
  });

  it('crea subcategoría con padre válido (profundidad 0 → hijo en 1)', async () => {
    const { uc } = makeUseCase({
      categoryOverride: {
        getById: vi.fn().mockResolvedValue(createTestCategory()),
        getDepth: vi.fn().mockResolvedValue(0),
      },
    });
    const result = await uc.execute({ ...entradaRaiz, padreId: UUID_CATEGORIA });
    expect(result.ok).toBe(true);
  });

  it('falla con rol WORKER', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaRaiz, actorRol: 'WORKER' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CATALOG_ROL_NO_AUTORIZADO');
  });

  it('falla si padre no existe', async () => {
    const { uc } = makeUseCase({
      categoryOverride: { getById: vi.fn().mockResolvedValue(null) },
    });
    const result = await uc.execute({ ...entradaRaiz, padreId: UUID_CATEGORIA });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CATALOG_CATEGORIA_NO_ENCONTRADA');
  });

  it('falla si profundidad excede el máximo (padre a profundidad 2)', async () => {
    const { uc } = makeUseCase({
      categoryOverride: {
        getById: vi.fn().mockResolvedValue(createTestCategory()),
        getDepth: vi.fn().mockResolvedValue(2),
      },
    });
    const result = await uc.execute({ ...entradaRaiz, padreId: UUID_CATEGORIA });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/profundidad|máximo|maximo/i);
  });

  it('falla con nombre vacío', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaRaiz, nombre: '' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CATALOG_NOMBRE_INVALIDO');
  });

  it('falla con orden negativo', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaRaiz, orden: -1 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CATALOG_ORDEN_INVALIDO');
  });

  it('publica evento CategoriaCreada', async () => {
    const { uc, publicador } = makeUseCase();
    await uc.execute(entradaRaiz);
    expect(publicador.publicar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'CategoriaCreada' }),
      UUID_CORRELACION,
    );
  });

  it('falla con padreId UUID inválido', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaRaiz, padreId: 'no-es-uuid' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CATALOG_ID_INVALIDO');
  });
});
