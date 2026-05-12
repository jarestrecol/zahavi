// ──────────────────────────────────────────────────────────────
// Public API del Bounded Context: Inventory
// ──────────────────────────────────────────────────────────────

// Errors & Result
export * from './errors/index.js';
export { ok, err } from './errors/DomainError.js';
export type { Result } from './errors/DomainError.js';

// Value Objects
export { UnidadNativa, TipoMovimiento, EstadoDeAlerta } from './value-objects/enums.js';
export {
  IngredientId,
  BusinessUnitId,
  StockItemId,
  StockMovementId,
  StockAlertId,
  SupplierId,
  PurchaseOrderId,
} from './value-objects/ids.js';

// Aggregates
export { Ingredient, type IngredientProps } from './aggregates/Ingredient.js';
export { StockItem, type StockItemProps } from './aggregates/StockItem.js';
export { Supplier, type SupplierProps } from './aggregates/Supplier.js';
export { StockAlert, type StockAlertProps } from './aggregates/StockAlert.js';

// Domain Events
export type * from './events/index.js';
