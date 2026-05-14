import type { ColumnType } from 'kysely';

type Timestamp = ColumnType<Date, string, string>;

// JSONB snapshot de una línea de BOM almacenada en production.orders.bom
export interface BomLineJson {
  id: string;
  ingredient_id: string;
  cantidad_valor: number;
  unidad: string;
}

// JSONB snapshot de un registro de merma almacenado en production.orders.mermas
export interface MermaJson {
  id: string;
  ingredient_id: string;
  cantidad_valor: number;
  unidad: string;
  motivo: string;
  registrada_por: string;
  registrada_en: string;
}

// JSONB snapshot del lote producido (null si la OdP no se ejecutó aún)
export interface LoteJson {
  codigo: string;
  cantidad_producida: number;
  producido_en: string;
}

export interface ProductionOrdersTable {
  id: string;
  variante_id: string;
  receta_id: string;
  planta_central_id: string;
  cantidad_a_producir: number;
  estado: string;
  bom: ColumnType<BomLineJson[], string, string>;
  mermas: ColumnType<MermaJson[], string, string>;
  lote: ColumnType<LoteJson | null, string | null, string | null>;
  creada_por: string;
  creada_en: Timestamp;
  actualizada_en: Timestamp;
}

export interface ProductionDispatchesTable {
  id: string;
  orden_id: string;
  codigo_lote: string;
  cantidad_despachada: number;
  lote_cantidad_total: number;
  planta_central_id: string;
  punto_de_venta_destino_id: string;
  estado: string;
  preparado_por: string;
  creado_en: Timestamp;
  actualizado_en: Timestamp;
}

export interface ProductionDatabase {
  'production.orders': ProductionOrdersTable;
  'production.dispatches': ProductionDispatchesTable;
}
