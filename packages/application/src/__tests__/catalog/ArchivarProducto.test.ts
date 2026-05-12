import { describe, it, expect, vi } from 'vitest';
import { ArchivarProducto } from '../../catalog/ArchivarProducto.js';
import {
  makeMockProductRepo,
  makeMockPublicador,
  createTestProduct,
  UUID_PRODUCTO,
  UUID_CORRELACION,
} from './helpers.js';

function makeUseCase(
  overrides: {
    productOverride?: Parameters<typeof makeMockProductRepo>[0];
  } = {},
) {
  const productRepo = makeMockProductRepo({
    getById: vi.fn().mockResolvedValue(createTestProduct({ estado: 'activo' })),
    ...overrides.productOverride,
  });
  const publicador = makeMockPublicador();
  const uc = new ArchivarProducto(productRepo, publicador);
  return { uc, productRepo, publicador };
}

const entradaBase = {
  productoId: UUID_PRODUCTO,
  motivo: 'Producto descontinuado',
  actorRol: 'ADMIN',
  correlacionId: UUID_CORRELACION,
};

describe('ArchivarProducto', () => {
  it('archiva un producto activo', async () => {
    const { uc, productRepo, publicador } = makeUseCase();
    const result = await uc.execute(entradaBase);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.estado).toBe('borrador');
    expect(productRepo.update).toHaveBeenCalledOnce();
    expect(publicador.publicar).toHaveBeenCalledOnce();
  });

  it('publica evento ProductoDesactivado', async () => {
    const { uc, publicador } = makeUseCase();
    await uc.execute(entradaBase);
    expect(publicador.publicar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'ProductoDesactivado' }),
      UUID_CORRELACION,
    );
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

  it('falla si producto ya está en borrador (ProductoYaEnEstadoError)', async () => {
    const { uc } = makeUseCase({
      productOverride: {
        getById: vi.fn().mockResolvedValue(createTestProduct({ estado: 'borrador' })),
      },
    });
    const result = await uc.execute(entradaBase);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CATALOG_PRODUCTO_YA_EN_ESTADO');
  });

  it('falla con productoId UUID inválido', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, productoId: 'mal-formato' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CATALOG_ID_INVALIDO');
  });
});
