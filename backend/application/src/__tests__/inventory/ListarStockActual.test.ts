import { describe, it, expect } from 'vitest';
import { ListarStockActual } from '../../inventory/ListarStockActual.js';
import { makeMockStockItemRepo, makeStockItem, UUID_BUNIT, UUID_BUNIT2 } from './helpers.js';

function makeUseCase(items = [makeStockItem()]) {
  const stockItemRepo = makeMockStockItemRepo({
    listByBusinessUnit: () => Promise.resolve(items),
  });
  return { uc: new ListarStockActual(stockItemRepo), stockItemRepo };
}

describe('ListarStockActual', () => {
  it('lista items para SUPERADMIN', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({
      businessUnitId: UUID_BUNIT,
      actorRol: 'SUPERADMIN',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items).toHaveLength(1);
    expect(result.value.items[0]?.cantidadDisponible).toBe(20);
  });

  it('lista items para ADMIN de su propia unidad', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({
      businessUnitId: UUID_BUNIT,
      actorRol: 'ADMIN',
      actorBusinessUnitId: UUID_BUNIT,
    });
    expect(result.ok).toBe(true);
  });

  it('ADMIN no puede ver otra unidad de negocio', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({
      businessUnitId: UUID_BUNIT2,
      actorRol: 'ADMIN',
      actorBusinessUnitId: UUID_BUNIT,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVENTORY_ACCESO_DENEGADO');
  });

  it('WORKER no tiene acceso', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({
      businessUnitId: UUID_BUNIT,
      actorRol: 'WORKER',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVENTORY_ROL_NO_AUTORIZADO');
  });

  it('devuelve lista vacía si no hay stock', async () => {
    const { uc } = makeUseCase([]);
    const result = await uc.execute({ businessUnitId: UUID_BUNIT, actorRol: 'SUPERADMIN' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items).toHaveLength(0);
  });
});
