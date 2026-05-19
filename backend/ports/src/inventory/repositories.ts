import type {
  Ingredient,
  StockItem,
  Supplier,
  StockAlert,
  IngredientId,
  BusinessUnitId,
  StockItemId,
  SupplierId,
  StockAlertId,
  StockMovementId,
  UnidadNativa,
  EstadoDeAlerta,
  TipoMovimiento,
} from '@zahavi/domain-inventory';
import type { FechaHora, Money } from '@zahavi/domain-shared-kernel';

/** Puerto de persistencia para el aggregate `Ingredient`. */
export interface IIngredientRepository {
  /** Persiste un nuevo ingrediente. */
  save(ingredient: Ingredient, correlacionId: string): Promise<void>;
  /** Retorna el ingrediente por ID, o `null` si no existe. */
  getById(ingredientId: IngredientId): Promise<Ingredient | null>;
  /** Lista todos los ingredientes del sistema. */
  list(): Promise<ReadonlyArray<Ingredient>>;
  /** Actualiza un ingrediente existente. */
  update(ingredient: Ingredient, correlacionId: string): Promise<void>;
}

/** Puerto de persistencia para el aggregate `StockItem` (saldo actual por ingrediente + BU). */
export interface IStockItemRepository {
  /** Persiste un nuevo stock item. */
  save(stockItem: StockItem, correlacionId: string): Promise<void>;
  /** Retorna el stock item por ID, o `null` si no existe. */
  getById(stockItemId: StockItemId): Promise<StockItem | null>;
  /** Retorna el stock item para un ingrediente en una unidad de negocio, o `null` si no existe. */
  getByIngredientAndUnit(
    ingredientId: IngredientId,
    businessUnitId: BusinessUnitId,
  ): Promise<StockItem | null>;
  /** Lista todos los stock items de una unidad de negocio. */
  listByBusinessUnit(businessUnitId: BusinessUnitId): Promise<ReadonlyArray<StockItem>>;
  /** Actualiza el saldo de un stock item existente. */
  update(stockItem: StockItem, correlacionId: string): Promise<void>;
}

/** Proyección inmutable de un movimiento de stock para persistencia (append-only). */
export interface StockMovementRecord {
  readonly id: StockMovementId;
  readonly ingredientId: IngredientId;
  readonly businessUnitId: BusinessUnitId;
  readonly tipo: TipoMovimiento;
  readonly cantidad: number;
  readonly unidad: UnidadNativa;
  readonly costoUnitario: Money;
  readonly referencia: string;
  readonly motivo: string;
  readonly supplierId: SupplierId | null;
  readonly ocurridoEn: FechaHora;
  readonly registradoPor: string;
}

/** Puerto de persistencia de movimientos de stock. Append-only: no hay update ni delete. */
export interface IStockMovementRepository {
  /** Registra un nuevo movimiento. */
  save(record: StockMovementRecord, correlacionId: string): Promise<void>;
  /** Retorna un movimiento por ID, o `null` si no existe. */
  getById(movimientoId: StockMovementId): Promise<StockMovementRecord | null>;
  /** Lista movimientos de un ingrediente, opcionalmente filtrados por rango de fechas. */
  listByIngredient(
    ingredientId: IngredientId,
    desde?: FechaHora,
    hasta?: FechaHora,
  ): Promise<ReadonlyArray<StockMovementRecord>>;
  /** Lista movimientos de una unidad de negocio, opcionalmente filtrados por rango de fechas. */
  listByBusinessUnit(
    businessUnitId: BusinessUnitId,
    desde?: FechaHora,
    hasta?: FechaHora,
  ): Promise<ReadonlyArray<StockMovementRecord>>;
}

/** Puerto de persistencia para el aggregate `StockAlert`. */
export interface IStockAlertRepository {
  /** Persiste una nueva alerta. */
  save(alerta: StockAlert, correlacionId: string): Promise<void>;
  /** Retorna la alerta por ID, o `null` si no existe. */
  getById(alertaId: StockAlertId): Promise<StockAlert | null>;
  /** Retorna la alerta abierta de un ingrediente en una BU, o `null` si no hay ninguna activa. */
  getOpenByIngredientAndUnit(
    ingredientId: IngredientId,
    businessUnitId: BusinessUnitId,
  ): Promise<StockAlert | null>;
  /** Lista alertas de una BU, opcionalmente filtradas por estado. */
  listByBusinessUnit(
    businessUnitId: BusinessUnitId,
    estado?: EstadoDeAlerta,
  ): Promise<ReadonlyArray<StockAlert>>;
  /** Actualiza el estado de una alerta existente. */
  update(alerta: StockAlert, correlacionId: string): Promise<void>;
}

/** Puerto de persistencia para el aggregate `Supplier`. */
export interface ISupplierRepository {
  /** Persiste un nuevo proveedor. */
  save(supplier: Supplier, correlacionId: string): Promise<void>;
  /** Retorna el proveedor por ID, o `null` si no existe. */
  getById(supplierId: SupplierId): Promise<Supplier | null>;
  /** Lista todos los proveedores. */
  list(): Promise<ReadonlyArray<Supplier>>;
  /** Actualiza un proveedor existente. */
  update(supplier: Supplier, correlacionId: string): Promise<void>;
}
