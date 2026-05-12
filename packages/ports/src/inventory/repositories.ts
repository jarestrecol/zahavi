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

// ──────────────────────────────────────────────────────────────
// Repositorio de Ingredientes
// ──────────────────────────────────────────────────────────────

export interface IIngredientRepository {
  save(ingredient: Ingredient, correlacionId: string): Promise<void>;
  getById(ingredientId: IngredientId): Promise<Ingredient | null>;
  list(): Promise<ReadonlyArray<Ingredient>>;
  update(ingredient: Ingredient, correlacionId: string): Promise<void>;
}

// ──────────────────────────────────────────────────────────────
// Repositorio de Stock Items
// ──────────────────────────────────────────────────────────────

export interface IStockItemRepository {
  save(stockItem: StockItem, correlacionId: string): Promise<void>;
  getById(stockItemId: StockItemId): Promise<StockItem | null>;
  getByIngredientAndUnit(
    ingredientId: IngredientId,
    businessUnitId: BusinessUnitId,
  ): Promise<StockItem | null>;
  listByBusinessUnit(businessUnitId: BusinessUnitId): Promise<ReadonlyArray<StockItem>>;
  update(stockItem: StockItem, correlacionId: string): Promise<void>;
}

// ──────────────────────────────────────────────────────────────
// Repositorio de Movimientos de Stock (append-only)
// ──────────────────────────────────────────────────────────────

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

export interface IStockMovementRepository {
  save(record: StockMovementRecord, correlacionId: string): Promise<void>;
  getById(movimientoId: StockMovementId): Promise<StockMovementRecord | null>;
  listByIngredient(
    ingredientId: IngredientId,
    desde?: FechaHora,
    hasta?: FechaHora,
  ): Promise<ReadonlyArray<StockMovementRecord>>;
  listByBusinessUnit(
    businessUnitId: BusinessUnitId,
    desde?: FechaHora,
    hasta?: FechaHora,
  ): Promise<ReadonlyArray<StockMovementRecord>>;
}

// ──────────────────────────────────────────────────────────────
// Repositorio de Alertas de Stock
// ──────────────────────────────────────────────────────────────

export interface IStockAlertRepository {
  save(alerta: StockAlert, correlacionId: string): Promise<void>;
  getById(alertaId: StockAlertId): Promise<StockAlert | null>;
  getOpenByIngredientAndUnit(
    ingredientId: IngredientId,
    businessUnitId: BusinessUnitId,
  ): Promise<StockAlert | null>;
  listByBusinessUnit(
    businessUnitId: BusinessUnitId,
    estado?: EstadoDeAlerta,
  ): Promise<ReadonlyArray<StockAlert>>;
  update(alerta: StockAlert, correlacionId: string): Promise<void>;
}

// ──────────────────────────────────────────────────────────────
// Repositorio de Proveedores
// ──────────────────────────────────────────────────────────────

export interface ISupplierRepository {
  save(supplier: Supplier, correlacionId: string): Promise<void>;
  getById(supplierId: SupplierId): Promise<Supplier | null>;
  list(): Promise<ReadonlyArray<Supplier>>;
  update(supplier: Supplier, correlacionId: string): Promise<void>;
}
