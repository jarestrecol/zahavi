import { describe, it, expect } from 'vitest';
import { AjustarStock } from '../../inventory/AjustarStock.js';
import {
  makeMockIngredientRepo,
  makeMockStockItemRepo,
  makeMockStockMovementRepo,
  makeMockStockAlertRepo,
  makeMockPublicador,
  makeIngredient,
  makeStockItem,
  makeAlertaAbierta,
  UUID_ING,
  UUID_BUNIT,
  UUID_CORRELACION,
} from './helpers.js';

const entradaBase = {
  ingredienteId: UUID_ING,
  businessUnitId: UUID_BUNIT,
  cantidadNueva: 15,
  motivo: 'Reconteo físico mensual',
  actorRol: 'ADMIN',
  correlacionId: UUID_CORRELACION,
};

function makeUseCase(
  opts: {
    cantidadActual?: number;
    umbral?: number;
    alertaAbierta?: boolean;
    stockItemExiste?: boolean;
  } = {},
) {
  const ingrediente = makeIngredient({ umbral: opts.umbral ?? 5 });
  const stockItem =
    opts.stockItemExiste === false ? null : makeStockItem({ cantidad: opts.cantidadActual ?? 20 });
  const alertaAbierta = opts.alertaAbierta ? makeAlertaAbierta() : null;

  const ingredientRepo = makeMockIngredientRepo({
    getById: () => Promise.resolve(ingrediente),
  });
  const stockItemRepo = makeMockStockItemRepo({
    getByIngredientAndUnit: () => Promise.resolve(stockItem),
  });
  const stockMovementRepo = makeMockStockMovementRepo();
  const stockAlertRepo = makeMockStockAlertRepo({
    getOpenByIngredientAndUnit: () => Promise.resolve(alertaAbierta),
  });
  const publicador = makeMockPublicador();

  const uc = new AjustarStock(
    ingredientRepo,
    stockItemRepo,
    stockMovementRepo,
    stockAlertRepo,
    publicador,
  );

  return { uc, stockItemRepo, stockMovementRepo, stockAlertRepo, publicador };
}

describe('AjustarStock', () => {
  it('ajusta el stock a la cantidad indicada', async () => {
    const { uc } = makeUseCase({ cantidadActual: 20 });
    const result = await uc.execute(entradaBase);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.cantidadAnterior).toBe(20);
    expect(result.value.cantidadNueva).toBe(15);
  });

  it('guarda el movimiento de ajuste', async () => {
    const { uc, stockMovementRepo } = makeUseCase();
    await uc.execute(entradaBase);
    expect(stockMovementRepo.save).toHaveBeenCalledOnce();
  });

  it('abre alerta si la nueva cantidad queda bajo umbral', async () => {
    const { uc, stockAlertRepo } = makeUseCase({ umbral: 10, alertaAbierta: false });
    const result = await uc.execute({ ...entradaBase, cantidadNueva: 3 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.alertaAbierta).toBe(true);
    expect(stockAlertRepo.save).toHaveBeenCalledOnce();
  });

  it('cierra alerta si la nueva cantidad supera el umbral', async () => {
    const { uc, stockAlertRepo } = makeUseCase({ umbral: 10, alertaAbierta: true });
    const result = await uc.execute({ ...entradaBase, cantidadNueva: 25 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.alertaCerrada).toBe(true);
    expect(stockAlertRepo.update).toHaveBeenCalledOnce();
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
    const result = await uc.execute({ ...entradaBase, motivo: '   ' });
    expect(result.ok).toBe(false);
  });

  it('falla si la cantidad nueva es negativa', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, cantidadNueva: -5 });
    expect(result.ok).toBe(false);
  });

  it('falla si el stock item no existe', async () => {
    const { uc } = makeUseCase({ stockItemExiste: false });
    const result = await uc.execute(entradaBase);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVENTORY_STOCK_ITEM_NO_ENCONTRADO');
  });
});
