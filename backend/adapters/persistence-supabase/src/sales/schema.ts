import type { ColumnType } from 'kysely';

type Timestamp = ColumnType<Date, string, string>;
type OptionalTimestamp = ColumnType<Date, string | undefined, string>;

export interface LineaComandaJson {
  id: string;
  variante_id: string;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  tasa_iva: number;
  estado: string;
}

export interface PagoDetalleJson {
  metodo: string;
  monto: number;
}

export interface FacturaLineaJson {
  variante_id: string;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  tasa_iva: number;
}

export interface SalesMesasTable {
  id: string;
  nombre: string;
  tipo: 'NORMAL' | 'AD_HOC';
  punto_de_venta_id: string;
  estado: 'LIBRE' | 'OCUPADA' | 'RESERVADA' | 'EN_COBRO';
  comanda_activa_id: string | null;
  creada_en: Timestamp;
  actualizada_en: OptionalTimestamp;
}

export interface SalesComandasTable {
  id: string;
  mesa_id: string;
  punto_de_venta_id: string;
  estado: 'ABIERTA' | 'ENVIADA' | 'EN_PREPARACION' | 'LISTA' | 'CERRADA' | 'CANCELADA';
  lineas: ColumnType<LineaComandaJson[], string, string>;
  tomada_por: string;
  cerrada_por: string | null;
  motivo_cancelacion: string | null;
  abierta_en: Timestamp;
  cerrada_en: Timestamp | null;
}

export interface SalesCobroTable {
  id: string;
  comanda_id: string;
  punto_de_venta_id: string;
  total_comanda: number;
  pagos: ColumnType<PagoDetalleJson[], string, string>;
  total_cobrado: number;
  cambio: number;
  estado: 'PENDIENTE' | 'PROCESADO' | 'FALLIDO' | 'ANULADO';
  cobrado_por: string;
  creado_en: Timestamp;
  procesado_en: Timestamp | null;
  motivo_anulacion: string | null;
}

export interface SalesFacturasTable {
  id: string;
  cobro_id: string;
  comanda_id: string;
  punto_de_venta_id: string;
  numero: string;
  lineas: ColumnType<FacturaLineaJson[], string, string>;
  subtotal: number;
  total_iva: number;
  total: number;
  estado: 'EMITIDA' | 'ANULADA';
  emitida_en: Timestamp;
  anulada_en: Timestamp | null;
  motivo_anulacion: string | null;
}

export interface SalesFacturaSequencesTable {
  punto_de_venta_id: string;
  anio: number;
  ultimo_numero: number;
}

export interface SalesDatabase {
  'sales.mesas': SalesMesasTable;
  'sales.comandas': SalesComandasTable;
  'sales.cobros': SalesCobroTable;
  'sales.facturas': SalesFacturasTable;
  'sales.factura_sequences': SalesFacturaSequencesTable;
}
