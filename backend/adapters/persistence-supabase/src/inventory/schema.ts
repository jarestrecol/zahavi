import type { ColumnType } from 'kysely';

type Timestamp = ColumnType<Date, string, string>;
type NullableTimestamp = ColumnType<Date | null, string | null, string | null>;

export interface InventorySuppliersTable {
  id: string;
  nombre: string;
  contacto: string;
  notas: string;
  estado: string;
  creado_en: Timestamp;
  actualizado_en: Timestamp;
}

export interface InventoryIngredientsTable {
  id: string;
  nombre: string;
  unidad_nativa: string;
  costo_unitario_actual: number;
  umbral_de_alerta: number;
  estado: string;
  creado_en: Timestamp;
  actualizado_en: Timestamp;
}

export interface InventoryStockItemsTable {
  id: string;
  ingredient_id: string;
  business_unit_id: string;
  cantidad_disponible: number;
  unidad_nativa: string;
  costo_promedio_cop: number;
  version: number;
  creado_en: Timestamp;
  actualizado_en: Timestamp;
}

export interface InventoryStockMovementsTable {
  id: string;
  ingredient_id: string;
  business_unit_id: string;
  tipo_movimiento: string;
  cantidad: number;
  unidad: string;
  costo_unitario: number;
  referencia: string;
  motivo: string;
  supplier_id: string | null;
  ocurrido_en: Timestamp;
  registrado_por: string;
}

export interface InventoryStockAlertsTable {
  id: string;
  ingredient_id: string;
  business_unit_id: string;
  stock_al_momento: number;
  umbral_al_momento: number;
  unidad: string;
  estado: string;
  creada_en: Timestamp;
  cierre_en: NullableTimestamp;
}

export interface InventoryDatabase {
  'inventory.suppliers': InventorySuppliersTable;
  'inventory.ingredients': InventoryIngredientsTable;
  'inventory.stock_items': InventoryStockItemsTable;
  'inventory.stock_movements': InventoryStockMovementsTable;
  'inventory.stock_alerts': InventoryStockAlertsTable;
}
