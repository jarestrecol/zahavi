import { describe, it, expect } from 'vitest';
import { RegistrarIngreso } from '../../inventory/RegistrarIngreso.js';
import {
  makeMockIngredientRepo,
  makeMockStockItemRepo,
  makeMockStockMovementRepo,
  makeMockStockAlertRepo,
  makeMockSupplierRepo,
  makeMockPublicador,
  makeIngredient,
  makeStockItem,
  makeSupplier,
  makeAlertaAbierta,
  UUID_ING,
  UUID_BUNIT,
  UUID_SUPPLIER,
  UUID_CORRELACION,
} from './helpers.js';

const entradaBase = {
  ingredienteId: UUID_ING,
  businessUnitId: UUID_BUNIT,
  cantidad: 10,
  costoUnitarioCop: 4_000,
  supplierId: UUID_SUPPLIER,
  correlacionId: UUID_CORRELACION,
};

function makeUseCase(
  overrides: {
    ingredienteExiste?: boolean;
    stockItemExiste?: boolean;
    proveedorActivo?: boolean;
    alertaAbierta?: boolean;
  } = {},
) {
  const ingrediente = makeIngredient({ umbral: 5 });
  const stockItem = makeStockItem({ cantidad: 20 });
  const proveedor = makeSupplier({ activo: overrides.proveedorActivo ?? true });
  const alertaAbierta = overrides.alertaAbierta ? makeAlertaAbierta() : null;

  const ingredientRepo = makeMockIngredientRepo({
    getById:
      overrides.ingredienteExiste === false
        ? () => Promise.resolve(null)
        : () => Promise.resolve(ingrediente),
  });
  const stockItemRepo = makeMockStockItemRepo({
    getByIngredientAndUnit:
      overrides.stockItemExiste === false
        ? () => Promise.resolve(null)
        : () => Promise.resolve(stockItem),
  });
  const stockMovementRepo = makeMockStockMovementRepo();
  const stockAlertRepo = makeMockStockAlertRepo({
    getOpenByIngredientAndUnit: () => Promise.resolve(alertaAbierta),
  });
  const supplierRepo = makeMockSupplierRepo({
    getById:
      overrides.proveedorActivo === false
        ? () => Promise.resolve(makeSupplier({ activo: false }))
        : () => Promise.resolve(proveedor),
  });
  const publicador = makeMockPublicador();

  const uc = new RegistrarIngreso(
    ingredientRepo,
    stockItemRepo,
    stockMovementRepo,
    stockAlertRepo,
    supplierRepo,
    publicador,
  );

  return {
    uc,
    ingredientRepo,
    stockItemRepo,
    stockMovementRepo,
    stockAlertRepo,
    supplierRepo,
    publicador,
  };
}

describe('RegistrarIngreso', () => {
  it('registra ingreso en stock existente con costo promedio ponderado', async () => {
    const { uc } = makeUseCase({ stockItemExiste: true });
    const result = await uc.execute(entradaBase);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.cantidadResultante).toBe(30); // 20 + 10
    // costo ponderado: (20 * 3500 + 10 * 4000) / 30 = 110000/30 ≈ 3667
    expect(result.value.costoPromedioNuevo).toBe(3_667);
  });

  it('crea nuevo StockItem cuando no existe', async () => {
    const { uc, stockItemRepo } = makeUseCase({ stockItemExiste: false });
    const result = await uc.execute(entradaBase);

    expect(result.ok).toBe(true);
    expect(stockItemRepo.save).toHaveBeenCalledOnce();
  });

  it('guarda movimiento de stock', async () => {
    const { uc, stockMovementRepo } = makeUseCase();
    await uc.execute(entradaBase);
    expect(stockMovementRepo.save).toHaveBeenCalledOnce();
  });

  it('publica eventos de dominio', async () => {
    const { uc, publicador } = makeUseCase();
    await uc.execute(entradaBase);
    expect(publicador.publicarLote).toHaveBeenCalled();
  });

  it('cierra alerta abierta si el ingreso supera el umbral', async () => {
    const { uc, stockAlertRepo } = makeUseCase({ alertaAbierta: true });
    const result = await uc.execute(entradaBase);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.alertaCerrada).toBe(true);
    expect(stockAlertRepo.update).toHaveBeenCalledOnce();
  });

  it('falla si el ingrediente no existe', async () => {
    const { uc } = makeUseCase({ ingredienteExiste: false });
    const result = await uc.execute(entradaBase);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVENTORY_INGREDIENTE_NO_ENCONTRADO');
  });

  it('falla si el proveedor está inactivo', async () => {
    const { uc } = makeUseCase({ proveedorActivo: false });
    const result = await uc.execute(entradaBase);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVENTORY_PROVEEDOR_INACTIVO');
  });

  it('falla si el costo es negativo', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, costoUnitarioCop: -1 });
    expect(result.ok).toBe(false);
  });

  it('falla si la cantidad es cero', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, cantidad: 0 });
    expect(result.ok).toBe(false);
  });
});
