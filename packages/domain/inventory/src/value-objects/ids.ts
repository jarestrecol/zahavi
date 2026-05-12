import { type Result, ok, err } from '../errors/DomainError.js';
import { IdInvalidoError } from '../errors/index.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Ingredient ID — identificador único de ingrediente. Canonical en este BC.
 * El BC Catalog mantiene una copia ACL opaca con el mismo tipo de valor (UUID).
 */
export class IngredientId {
  private constructor(private readonly _value: string) {}

  static of(value: string): Result<IngredientId, IdInvalidoError> {
    if (!UUID_RE.test(value)) return err(new IdInvalidoError('IngredientId'));
    return ok(new IngredientId(value));
  }

  static nuevo(): IngredientId {
    return new IngredientId(crypto.randomUUID());
  }

  toString(): string {
    return this._value;
  }

  equals(other: IngredientId): boolean {
    return this._value === other._value;
  }
}

/**
 * BusinessUnit ID — identifica planta central o punto de venta.
 */
export class BusinessUnitId {
  private constructor(private readonly _value: string) {}

  static of(value: string): Result<BusinessUnitId, IdInvalidoError> {
    if (!UUID_RE.test(value)) return err(new IdInvalidoError('BusinessUnitId'));
    return ok(new BusinessUnitId(value));
  }

  toString(): string {
    return this._value;
  }

  equals(other: BusinessUnitId): boolean {
    return this._value === other._value;
  }
}

/**
 * StockItem ID — identifica el stock de un ingrediente en una unidad de negocio.
 */
export class StockItemId {
  private constructor(private readonly _value: string) {}

  static of(value: string): Result<StockItemId, IdInvalidoError> {
    if (!UUID_RE.test(value)) return err(new IdInvalidoError('StockItemId'));
    return ok(new StockItemId(value));
  }

  static nuevo(): StockItemId {
    return new StockItemId(crypto.randomUUID());
  }

  toString(): string {
    return this._value;
  }

  equals(other: StockItemId): boolean {
    return this._value === other._value;
  }
}

/**
 * PurchaseOrder ID — identificador único de orden de compra.
 */
export class PurchaseOrderId {
  private constructor(private readonly _value: string) {}

  static of(value: string): Result<PurchaseOrderId, IdInvalidoError> {
    if (!UUID_RE.test(value)) return err(new IdInvalidoError('PurchaseOrderId'));
    return ok(new PurchaseOrderId(value));
  }

  toString(): string {
    return this._value;
  }

  equals(other: PurchaseOrderId): boolean {
    return this._value === other._value;
  }
}

/**
 * Supplier ID — identificador único de proveedor.
 */
export class SupplierId {
  private constructor(private readonly _value: string) {}

  static of(value: string): Result<SupplierId, IdInvalidoError> {
    if (!UUID_RE.test(value)) return err(new IdInvalidoError('SupplierId'));
    return ok(new SupplierId(value));
  }

  static nuevo(): SupplierId {
    return new SupplierId(crypto.randomUUID());
  }

  toString(): string {
    return this._value;
  }

  equals(other: SupplierId): boolean {
    return this._value === other._value;
  }
}

/**
 * StockMovement ID — identificador único de movimiento de stock (append-only).
 */
export class StockMovementId {
  private constructor(private readonly _value: string) {}

  static of(value: string): Result<StockMovementId, IdInvalidoError> {
    if (!UUID_RE.test(value)) return err(new IdInvalidoError('StockMovementId'));
    return ok(new StockMovementId(value));
  }

  static nuevo(): StockMovementId {
    return new StockMovementId(crypto.randomUUID());
  }

  toString(): string {
    return this._value;
  }

  equals(other: StockMovementId): boolean {
    return this._value === other._value;
  }
}

/**
 * StockAlert ID — identificador único de una alerta de stock.
 */
export class StockAlertId {
  private constructor(private readonly _value: string) {}

  static of(value: string): Result<StockAlertId, IdInvalidoError> {
    if (!UUID_RE.test(value)) return err(new IdInvalidoError('StockAlertId'));
    return ok(new StockAlertId(value));
  }

  static nuevo(): StockAlertId {
    return new StockAlertId(crypto.randomUUID());
  }

  toString(): string {
    return this._value;
  }

  equals(other: StockAlertId): boolean {
    return this._value === other._value;
  }
}
