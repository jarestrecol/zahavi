import { FechaHora } from '@zahavi/domain-shared-kernel';
import {
  Mesa,
  Comanda,
  Cobro,
  Factura,
  LineaDeComanda,
  FacturaLinea,
  PagoDetalle,
  MesaId,
  ComandaId,
  CobroId,
  FacturaId,
  LineaDeComandaId,
  BusinessUnitIdRef,
  UsuarioIdRef,
  ProductVariantIdRef,
  EstadoDeMesa,
  TipoDeMesa,
  EstadoDeComanda,
  EstadoDeLinea,
  EstadoDeCobro,
  EstadoDeFactura,
  MetodoDePago,
  Dinero,
  TasaIVA,
  NombreMesa,
  NumeroFactura,
} from '@zahavi/domain-sales';
import type { LineaComandaJson, PagoDetalleJson, FacturaLineaJson } from './schema.js';

// ── Helpers ───────────────────────────────────────────────────

function mustId<T>(res: { ok: true; value: T } | { ok: false; error: unknown }, ctx: string): T {
  if (!res.ok) throw new Error(`sales mapper: ID inválido en ${ctx}`);
  return res.value;
}

function mustDinero(valor: number, ctx: string): Dinero {
  const res = Dinero.de(valor);
  if (!res.ok) throw new Error(`sales mapper: Dinero inválido (${valor}) en ${ctx}`);
  return res.value;
}

function mustTasaIVA(valor: number): TasaIVA {
  const res = TasaIVA.of(valor);
  if (!res.ok) throw new Error(`sales mapper: TasaIVA inválida: ${valor}`);
  return res.value;
}

function toFechaHora(date: Date | string): FechaHora {
  const ms = typeof date === 'string' ? new Date(date).getTime() : (date as Date).getTime();
  return FechaHora.deTimestamp(ms);
}

function toFechaHoraNullable(date: Date | string | null): FechaHora | null {
  if (!date) return null;
  return toFechaHora(date);
}

// ── Lineas de comanda ─────────────────────────────────────────

function rowToLinea(row: LineaComandaJson): LineaDeComanda {
  return LineaDeComanda.reconstituir({
    id: mustId(LineaDeComandaId.of(row.id), 'LineaDeComandaId'),
    varianteId: mustId(ProductVariantIdRef.of(row.variante_id), 'ProductVariantIdRef'),
    nombreProducto: row.nombre_producto,
    cantidad: row.cantidad,
    precioUnitario: mustDinero(row.precio_unitario, 'precioUnitario'),
    tasaIVA: mustTasaIVA(row.tasa_iva),
    estado: row.estado as EstadoDeLinea,
  });
}

function lineaToJson(linea: LineaDeComanda): LineaComandaJson {
  return {
    id: linea.id.toString(),
    variante_id: linea.varianteId.toString(),
    nombre_producto: linea.nombreProducto,
    cantidad: linea.cantidad,
    precio_unitario: linea.precioUnitario.valor,
    tasa_iva: linea.tasaIVA.valor,
    estado: linea.estado,
  };
}

// ── PagoDetalle ───────────────────────────────────────────────

function rowToPago(row: PagoDetalleJson): PagoDetalle {
  return PagoDetalle.crear(row.metodo as MetodoDePago, mustDinero(row.monto, 'PagoDetalle.monto'));
}

function pagoToJson(pago: PagoDetalle): PagoDetalleJson {
  return { metodo: pago.metodo, monto: pago.monto.valor };
}

// ── FacturaLinea ──────────────────────────────────────────────

function rowToFacturaLinea(row: FacturaLineaJson): FacturaLinea {
  return FacturaLinea.crear({
    varianteId: row.variante_id,
    nombreProducto: row.nombre_producto,
    cantidad: row.cantidad,
    precioUnitario: mustDinero(row.precio_unitario, 'FacturaLinea.precioUnitario'),
    tasaIVA: mustTasaIVA(row.tasa_iva),
  });
}

function facturaLineaToJson(linea: FacturaLinea): FacturaLineaJson {
  return {
    variante_id: linea.varianteId,
    nombre_producto: linea.nombreProducto,
    cantidad: linea.cantidad,
    precio_unitario: linea.precioUnitario.valor,
    tasa_iva: linea.tasaIVA.valor,
  };
}

// ── Utilidad JSONB ────────────────────────────────────────────

export function parseJsonb<T>(value: T | string): T {
  return typeof value === 'string' ? (JSON.parse(value) as T) : value;
}

// ── Mesa ──────────────────────────────────────────────────────

export interface MesaRowParsed {
  id: string;
  nombre: string;
  tipo: string;
  punto_de_venta_id: string;
  estado: string;
  comanda_activa_id: string | null;
  creada_en: Date | string;
}

export function rowToMesa(row: MesaRowParsed): Mesa {
  const nombreRes = NombreMesa.of(row.nombre);
  if (!nombreRes.ok) throw new Error(`sales mapper: NombreMesa inválido: ${row.nombre}`);

  return Mesa.reconstituir({
    id: mustId(MesaId.of(row.id), 'MesaId'),
    nombre: nombreRes.value,
    tipo: row.tipo as TipoDeMesa,
    puntoDeVentaId: mustId(BusinessUnitIdRef.of(row.punto_de_venta_id), 'BusinessUnitIdRef'),
    estado: row.estado as EstadoDeMesa,
    comandaActivaId: row.comanda_activa_id
      ? mustId(ComandaId.of(row.comanda_activa_id), 'ComandaId')
      : null,
    creadaEn: toFechaHora(row.creada_en),
  });
}

export function mesaToInsertRow(mesa: Mesa) {
  return {
    id: mesa.id.toString(),
    nombre: mesa.nombre.toString(),
    tipo: mesa.tipo,
    punto_de_venta_id: mesa.puntoDeVentaId.toString(),
    estado: mesa.estado,
    comanda_activa_id: mesa.comandaActivaId?.toString() ?? null,
    creada_en: mesa.creadaEn.toISOString(),
  };
}

// ── Comanda ───────────────────────────────────────────────────

export interface ComandaRowParsed {
  id: string;
  mesa_id: string;
  punto_de_venta_id: string;
  estado: string;
  lineas: LineaComandaJson[];
  tomada_por: string;
  cerrada_por: string | null;
  motivo_cancelacion: string | null;
  abierta_en: Date | string;
  cerrada_en: Date | string | null;
}

export function rowToComanda(row: ComandaRowParsed): Comanda {
  return Comanda.reconstituir({
    id: mustId(ComandaId.of(row.id), 'ComandaId'),
    mesaId: mustId(MesaId.of(row.mesa_id), 'MesaId'),
    puntoDeVentaId: mustId(BusinessUnitIdRef.of(row.punto_de_venta_id), 'BusinessUnitIdRef'),
    estado: row.estado as EstadoDeComanda,
    lineas: row.lineas.map(rowToLinea),
    tomadaPor: mustId(UsuarioIdRef.of(row.tomada_por), 'UsuarioIdRef'),
    cerradaPor: row.cerrada_por ? mustId(UsuarioIdRef.of(row.cerrada_por), 'UsuarioIdRef') : null,
    motivoCancelacion: row.motivo_cancelacion,
    abiertaEn: toFechaHora(row.abierta_en),
    cerradaEn: toFechaHoraNullable(row.cerrada_en),
  });
}

export function comandaToInsertRow(comanda: Comanda) {
  return {
    id: comanda.id.toString(),
    mesa_id: comanda.mesaId.toString(),
    punto_de_venta_id: comanda.puntoDeVentaId.toString(),
    estado: comanda.estado,
    lineas: JSON.stringify(comanda.lineas.map(lineaToJson)),
    tomada_por: comanda.tomadaPor.toString(),
    cerrada_por: comanda.cerradaPor?.toString() ?? null,
    motivo_cancelacion: comanda.motivoCancelacion,
    abierta_en: comanda.abiertaEn.toISOString(),
    cerrada_en: comanda.cerradaEn?.toISOString() ?? null,
  };
}

// ── Cobro ─────────────────────────────────────────────────────

export interface CobroRowParsed {
  id: string;
  comanda_id: string;
  punto_de_venta_id: string;
  total_comanda: number;
  pagos: PagoDetalleJson[];
  total_cobrado: number;
  cambio: number;
  estado: string;
  cobrado_por: string;
  creado_en: Date | string;
  procesado_en: Date | string | null;
  motivo_anulacion: string | null;
}

export function rowToCobro(row: CobroRowParsed): Cobro {
  return Cobro.reconstituir({
    id: mustId(CobroId.of(row.id), 'CobroId'),
    comandaId: mustId(ComandaId.of(row.comanda_id), 'ComandaId'),
    puntoDeVentaId: mustId(BusinessUnitIdRef.of(row.punto_de_venta_id), 'BusinessUnitIdRef'),
    totalComanda: mustDinero(row.total_comanda, 'totalComanda'),
    pagos: row.pagos.map(rowToPago),
    totalCobrado: mustDinero(row.total_cobrado, 'totalCobrado'),
    cambio: mustDinero(row.cambio, 'cambio'),
    estado: row.estado as EstadoDeCobro,
    cobradoPor: mustId(UsuarioIdRef.of(row.cobrado_por), 'UsuarioIdRef'),
    creadoEn: toFechaHora(row.creado_en),
    procesadoEn: toFechaHoraNullable(row.procesado_en),
    motivoAnulacion: row.motivo_anulacion,
  });
}

export function cobroToInsertRow(cobro: Cobro) {
  return {
    id: cobro.id.toString(),
    comanda_id: cobro.comandaId.toString(),
    punto_de_venta_id: cobro.puntoDeVentaId.toString(),
    total_comanda: cobro.totalComanda.valor,
    pagos: JSON.stringify(cobro.pagos.map(pagoToJson)),
    total_cobrado: cobro.totalCobrado.valor,
    cambio: cobro.cambio.valor,
    estado: cobro.estado,
    cobrado_por: cobro.cobradoPor.toString(),
    creado_en: cobro.creadoEn.toISOString(),
    procesado_en: cobro.procesadoEn?.toISOString() ?? null,
    motivo_anulacion: cobro.motivoAnulacion,
  };
}

// ── Factura ───────────────────────────────────────────────────

export interface FacturaRowParsed {
  id: string;
  cobro_id: string;
  comanda_id: string;
  punto_de_venta_id: string;
  numero: string;
  lineas: FacturaLineaJson[];
  subtotal: number;
  total_iva: number;
  total: number;
  estado: string;
  emitida_en: Date | string;
  anulada_en: Date | string | null;
  motivo_anulacion: string | null;
}

export function rowToFactura(row: FacturaRowParsed): Factura {
  const numeroRes = NumeroFactura.of(row.numero);
  if (!numeroRes.ok) throw new Error(`sales mapper: NumeroFactura inválido: ${row.numero}`);

  return Factura.reconstituir({
    id: mustId(FacturaId.of(row.id), 'FacturaId'),
    cobroId: mustId(CobroId.of(row.cobro_id), 'CobroId'),
    comandaId: mustId(ComandaId.of(row.comanda_id), 'ComandaId'),
    puntoDeVentaId: mustId(BusinessUnitIdRef.of(row.punto_de_venta_id), 'BusinessUnitIdRef'),
    numero: numeroRes.value,
    lineas: row.lineas.map(rowToFacturaLinea),
    subtotal: mustDinero(row.subtotal, 'subtotal'),
    totalIVA: mustDinero(row.total_iva, 'totalIVA'),
    total: mustDinero(row.total, 'total'),
    estado: row.estado as EstadoDeFactura,
    emitidaEn: toFechaHora(row.emitida_en),
    anuladaEn: toFechaHoraNullable(row.anulada_en),
    motivoAnulacion: row.motivo_anulacion,
  });
}

export function facturaToInsertRow(factura: Factura) {
  return {
    id: factura.id.toString(),
    cobro_id: factura.cobroId.toString(),
    comanda_id: factura.comandaId.toString(),
    punto_de_venta_id: factura.puntoDeVentaId.toString(),
    numero: factura.numero.toString(),
    lineas: JSON.stringify(factura.lineas.map(facturaLineaToJson)),
    subtotal: factura.subtotal.valor,
    total_iva: factura.totalIVA.valor,
    total: factura.total.valor,
    estado: factura.estado,
    emitida_en: factura.emitidaEn.toISOString(),
    anulada_en: factura.anuladaEn?.toISOString() ?? null,
    motivo_anulacion: factura.motivoAnulacion,
  };
}
