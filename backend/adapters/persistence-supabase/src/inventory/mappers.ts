import {
  Ingredient,
  IngredientId,
  StockItem,
  StockItemId,
  StockAlert,
  StockAlertId,
  Supplier,
  SupplierId,
  BusinessUnitId,
  StockMovementId,
  UnidadNativa,
  EstadoDeAlerta,
  TipoMovimiento,
} from '@zahavi/domain-inventory';
import { Money, FechaHora } from '@zahavi/domain-shared-kernel';
import type { StockMovementRecord } from '@zahavi/ports';
import type { Selectable } from 'kysely';
import type {
  InventorySuppliersTable,
  InventoryIngredientsTable,
  InventoryStockItemsTable,
  InventoryStockMovementsTable,
  InventoryStockAlertsTable,
} from './schema.js';

type SupplierRow = Selectable<InventorySuppliersTable>;
type IngredientRow = Selectable<InventoryIngredientsTable>;
type StockItemRow = Selectable<InventoryStockItemsTable>;
type StockMovementRow = Selectable<InventoryStockMovementsTable>;
type StockAlertRow = Selectable<InventoryStockAlertsTable>;

function toFechaHora(date: Date): FechaHora {
  return FechaHora.deTimestamp((date as unknown as Date).getTime());
}

function unwrap<T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!r.ok) throw new Error(`Mapper falló: ${JSON.stringify(r.error)}`);
  return r.value;
}

// ── Supplier ──────────────────────────────────────────────────

export function rowToSupplier(row: SupplierRow): Supplier {
  return Supplier.reconstituir({
    id: unwrap(SupplierId.of(row.id)),
    nombre: row.nombre,
    contacto: row.contacto,
    notas: row.notas,
    estado: row.estado as 'activo' | 'inactivo',
    creadoEn: toFechaHora(row.creado_en as unknown as Date),
  });
}

// ── Ingredient ──────────────────────────────────────────────────

export function rowToIngredient(row: IngredientRow): Ingredient {
  return Ingredient.reconstituir({
    id: unwrap(IngredientId.of(row.id)),
    nombre: row.nombre,
    unidadNativa: row.unidad_nativa as UnidadNativa,
    costoUnitarioActual: unwrap(Money.deCop(Number(row.costo_unitario_actual))),
    umbralDeAlerta: Number(row.umbral_de_alerta),
    estado: row.estado as 'activo' | 'inactivo',
    creadoEn: toFechaHora(row.creado_en as unknown as Date),
  });
}

// ── StockItem ──────────────────────────────────────────────────

export function rowToStockItem(row: StockItemRow): StockItem {
  return StockItem.reconstituir({
    id: unwrap(StockItemId.of(row.id)),
    ingredientId: unwrap(IngredientId.of(row.ingredient_id)),
    businessUnitId: unwrap(BusinessUnitId.of(row.business_unit_id)),
    cantidadDisponible: Number(row.cantidad_disponible),
    unidadNativa: row.unidad_nativa as UnidadNativa,
    costoPromedioUnitario: unwrap(Money.deCop(Number(row.costo_promedio_cop))),
    version: row.version,
    actualizadoEn: toFechaHora(row.actualizado_en as unknown as Date),
  });
}

// ── StockMovementRecord ──────────────────────────────────────

export function rowToMovement(row: StockMovementRow): StockMovementRecord {
  return {
    id: unwrap(StockMovementId.of(row.id)),
    ingredientId: unwrap(IngredientId.of(row.ingredient_id)),
    businessUnitId: unwrap(BusinessUnitId.of(row.business_unit_id)),
    tipo: row.tipo_movimiento as TipoMovimiento,
    cantidad: Number(row.cantidad),
    unidad: row.unidad as UnidadNativa,
    costoUnitario: unwrap(Money.deCop(Number(row.costo_unitario))),
    referencia: row.referencia,
    motivo: row.motivo,
    supplierId: row.supplier_id ? unwrap(SupplierId.of(row.supplier_id)) : null,
    ocurridoEn: toFechaHora(row.ocurrido_en as unknown as Date),
    registradoPor: row.registrado_por,
  };
}

// ── StockAlert ──────────────────────────────────────────────────

export function rowToAlert(row: StockAlertRow): StockAlert {
  return StockAlert.reconstituir({
    id: unwrap(StockAlertId.of(row.id)),
    ingredientId: unwrap(IngredientId.of(row.ingredient_id)),
    businessUnitId: unwrap(BusinessUnitId.of(row.business_unit_id)),
    stockAlMomento: Number(row.stock_al_momento),
    umbralAlMomento: Number(row.umbral_al_momento),
    unidad: row.unidad as UnidadNativa,
    estado: row.estado as EstadoDeAlerta,
    creadaEn: toFechaHora(row.creada_en as unknown as Date),
    cierreEn: row.cierre_en ? toFechaHora(row.cierre_en as unknown as Date) : null,
  });
}
