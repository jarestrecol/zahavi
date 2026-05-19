import { describe, it, expect } from 'vitest';
import { RegistrarMerma } from '../../inventory/RegistrarMerma.js';
import {
  makeMockIngredientRepo,
  makeMockStockItemRepo,
  makeMockStockMovementRepo,
  makeMockStockAlertRepo,
  makeMockPublicador,
  makeIngredient,
  makeStockItem,
  UUID_ING,
  UUID_BUNIT,
  UUID_CORRELACION,
} from './helpers.js';

const entradaBase = {
  ingredienteId: UUID_ING,
  businessUnitId: UUID_BUNIT,
  cantidad: 2,
  motivo: 'Vencimiento por temperatura',
  actorRol: 'ADMIN',
  correlacionId: UUID_CORRELACION,
};

function makeUseCase(opts: { cantidadActual?: number; umbral?: number } = {}) {
  const ingrediente = makeIngredient({ umbral: opts.umbral ?? 5 });
  const stockItem = makeStockItem({ cantidad: opts.cantidadActual ?? 20 });

  const ingredientRepo = makeMockIngredientRepo({
    getById: () => Promise.resolve(ingrediente),
  });
  const stockItemRepo = makeMockStockItemRepo({
    getByIngredientAndUnit: () => Promise.resolve(stockItem),
  });
  const stockMovementRepo = makeMockStockMovementRepo();
  const stockAlertRepo = makeMockStockAlertRepo();
  const publicador = makeMockPublicador();

  const uc = new RegistrarMerma(
    ingredientRepo,
    stockItemRepo,
    stockMovementRepo,
    stockAlertRepo,
    publicador,
  );

  return { uc, stockItemRepo, stockMovementRepo, stockAlertRepo, publicador };
}

describe('RegistrarMerma', () => {
  it('registra la merma y descuenta del stock', async () => {
    const { uc } = makeUseCase({ cantidadActual: 20 });
    const result = await uc.execute(entradaBase);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.cantidadResultante).toBe(18); // 20 - 2
  });

  it('guarda movimiento de tipo WASTE', async () => {
    const { uc, stockMovementRepo } = makeUseCase();
    await uc.execute(entradaBase);
    expect(stockMovementRepo.save).toHaveBeenCalledOnce();
    const [record] = (stockMovementRepo.save as ReturnType<typeof vi.fn>).mock.calls[0] as [
      { tipo: string },
    ];
    expect(record.tipo).toBe('WASTE');
  });

  it('abre alerta si la merma deja el stock bajo el umbral', async () => {
    const { uc, stockAlertRepo } = makeUseCase({ cantidadActual: 6, umbral: 5 });
    const result = await uc.execute({ ...entradaBase, cantidad: 4 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.alertaAbierta).toBe(true);
    expect(stockAlertRepo.save).toHaveBeenCalledOnce();
  });

  it('no abre alerta si no hay umbral configurado (umbral=0)', async () => {
    const { uc, stockAlertRepo } = makeUseCase({ cantidadActual: 10, umbral: 0 });
    const result = await uc.execute({ ...entradaBase, cantidad: 9 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.alertaAbierta).toBe(false);
    expect(stockAlertRepo.save).not.toHaveBeenCalled();
  });

  it('falla con WORKER', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, actorRol: 'WORKER' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVENTORY_ROL_NO_AUTORIZADO');
  });

  it('falla con motivo vacío', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, motivo: '' });
    expect(result.ok).toBe(false);
  });

  it('falla si la merma supera el stock disponible', async () => {
    const { uc } = makeUseCase({ cantidadActual: 3 });
    const result = await uc.execute({ ...entradaBase, cantidad: 10 });
    expect(result.ok).toBe(false);
  });
});

import { vi } from 'vitest';
