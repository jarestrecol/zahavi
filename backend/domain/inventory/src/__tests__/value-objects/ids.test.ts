import { describe, it, expect } from 'vitest';
import {
  IngredientId,
  BusinessUnitId,
  StockItemId,
  StockMovementId,
  StockAlertId,
  SupplierId,
  PurchaseOrderId,
} from '../../value-objects/ids.js';
import { IdInvalidoError } from '../../errors/index.js';

const UUID_A = '00000000-0000-0000-0000-000000000001';
const UUID_B = '00000000-0000-0000-0000-000000000002';

describe('IngredientId', () => {
  it('acepta un UUID válido', () => {
    const r = IngredientId.of(UUID_A);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.toString()).toBe(UUID_A);
  });

  it('rechaza un valor no-UUID', () => {
    const r = IngredientId.of('no-es-uuid');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(IdInvalidoError);
  });

  it('equals es por valor', () => {
    const a1 = IngredientId.of(UUID_A);
    const a2 = IngredientId.of(UUID_A);
    const b = IngredientId.of(UUID_B);
    if (a1.ok && a2.ok && b.ok) {
      expect(a1.value.equals(a2.value)).toBe(true);
      expect(a1.value.equals(b.value)).toBe(false);
    }
  });
});

describe('BusinessUnitId', () => {
  it('acepta un UUID válido', () => {
    const r = BusinessUnitId.of(UUID_B);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.toString()).toBe(UUID_B);
  });

  it('rechaza cadena vacía', () => {
    const r = BusinessUnitId.of('');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(IdInvalidoError);
  });
});

describe('StockItemId', () => {
  it('acepta un UUID válido', () => {
    const r = StockItemId.of(UUID_A);
    expect(r.ok).toBe(true);
  });

  it('rechaza UUID malformado', () => {
    const r = StockItemId.of('00000000-0000-0000-0000');
    expect(r.ok).toBe(false);
  });
});

describe('otros ids', () => {
  it('StockMovementId, StockAlertId, SupplierId, PurchaseOrderId aceptan UUID', () => {
    expect(StockMovementId.of(UUID_A).ok).toBe(true);
    expect(StockAlertId.of(UUID_A).ok).toBe(true);
    expect(SupplierId.of(UUID_A).ok).toBe(true);
    expect(PurchaseOrderId.of(UUID_A).ok).toBe(true);
  });

  it('SupplierId rechaza no-UUID', () => {
    const r = SupplierId.of('abc');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(IdInvalidoError);
  });
});
