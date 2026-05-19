import { FechaHora } from '@zahavi/domain-shared-kernel';
import {
  OrdenDeProduccion,
  DespachoAPunto,
  LineaDeBOM,
  RegistroDeMerma,
  LoteDeProduccion,
  CodigoDeLote,
  Cantidad,
  OrdenDeProduccionId,
  LineaDeBOMId,
  RegistroDeMermaId,
  DespachoId,
  ProductVariantIdRef,
  RecipeIdRef,
  BusinessUnitIdRef,
  UsuarioIdRef,
  IngredientIdRef,
  EstadoDeOrdenDeProduccion,
  EstadoDeDespacho,
  UnidadDeMedida,
} from '@zahavi/domain-production';
import type { BomLineJson, MermaJson } from './schema.js';

// ── Helpers de reconstrucción ─────────────────────────────────

function mustId<T>(res: { ok: true; value: T } | { ok: false; error: unknown }, ctx: string): T {
  if (!res.ok) throw new Error(`production mapper: ID inválido en ${ctx}`);
  return res.value;
}

function mustCantidad(valor: number, unidad: string): Cantidad {
  const res = Cantidad.de(valor, unidad as UnidadDeMedida);
  if (!res.ok) throw new Error(`production mapper: Cantidad inválida (${valor} ${unidad})`);
  return res.value;
}

function toFechaHora(date: Date | string): FechaHora {
  const ms = typeof date === 'string' ? new Date(date).getTime() : (date as Date).getTime();
  return FechaHora.deTimestamp(ms);
}

// ── BOM / Mermas ──────────────────────────────────────────────

function rowToBomLinea(row: BomLineJson): LineaDeBOM {
  return LineaDeBOM.reconstituir({
    id: mustId(LineaDeBOMId.of(row.id), 'LineaDeBOMId'),
    ingredientId: mustId(IngredientIdRef.of(row.ingredient_id), 'IngredientIdRef'),
    cantidadRequerida: mustCantidad(row.cantidad_valor, row.unidad),
  });
}

function rowToMerma(row: MermaJson): RegistroDeMerma {
  return RegistroDeMerma.reconstituir({
    id: mustId(RegistroDeMermaId.of(row.id), 'RegistroDeMermaId'),
    ingredientId: mustId(IngredientIdRef.of(row.ingredient_id), 'IngredientIdRef'),
    cantidad: mustCantidad(row.cantidad_valor, row.unidad),
    motivo: row.motivo,
    registradaPor: mustId(UsuarioIdRef.of(row.registrada_por), 'UsuarioIdRef'),
    registradaEn: FechaHora.deTimestamp(new Date(row.registrada_en).getTime()),
  });
}

// ── OrdenDeProduccion ─────────────────────────────────────────

export interface OrderRowParsed {
  id: string;
  variante_id: string;
  receta_id: string;
  planta_central_id: string;
  cantidad_a_producir: number;
  estado: string;
  bom: BomLineJson[];
  mermas: MermaJson[];
  lote: { codigo: string; cantidad_producida: number; producido_en: string } | null;
  creada_por: string;
  creada_en: Date | string;
}

export function rowToOrden(row: OrderRowParsed): OrdenDeProduccion {
  const bom = row.bom.map(rowToBomLinea);
  const mermas = row.mermas.map(rowToMerma);

  let lote: LoteDeProduccion | null = null;
  if (row.lote) {
    const codigoRes = CodigoDeLote.of(row.lote.codigo);
    if (!codigoRes.ok)
      throw new Error(`production mapper: CodigoDeLote inválido: ${row.lote.codigo}`);
    lote = LoteDeProduccion.crear(
      codigoRes.value,
      row.lote.cantidad_producida,
      FechaHora.deTimestamp(new Date(row.lote.producido_en).getTime()),
    );
  }

  return OrdenDeProduccion.reconstituir({
    id: mustId(OrdenDeProduccionId.of(row.id), 'OrdenDeProduccionId'),
    varianteId: mustId(ProductVariantIdRef.of(row.variante_id), 'ProductVariantIdRef'),
    recetaId: mustId(RecipeIdRef.of(row.receta_id), 'RecipeIdRef'),
    plantaCentralId: mustId(BusinessUnitIdRef.of(row.planta_central_id), 'BusinessUnitIdRef'),
    cantidadAProducir: row.cantidad_a_producir,
    estado: row.estado as EstadoDeOrdenDeProduccion,
    bom,
    mermas,
    lote,
    creadaPor: mustId(UsuarioIdRef.of(row.creada_por), 'UsuarioIdRef'),
    creadaEn: toFechaHora(row.creada_en),
  });
}

export function ordenToInsertRow(orden: OrdenDeProduccion) {
  const bomJson: BomLineJson[] = orden.bom.map((l) => ({
    id: l.id.toString(),
    ingredient_id: l.ingredientId.toString(),
    cantidad_valor: l.cantidadRequerida.valor(),
    unidad: l.cantidadRequerida.unidad(),
  }));

  const mermasJson: MermaJson[] = orden.mermas.map((m) => ({
    id: m.id.toString(),
    ingredient_id: m.ingredientId.toString(),
    cantidad_valor: m.cantidad.valor(),
    unidad: m.cantidad.unidad(),
    motivo: m.motivo,
    registrada_por: m.registradaPor.toString(),
    registrada_en: m.registradaEn.toISOString(),
  }));

  const loteJson = orden.lote
    ? JSON.stringify({
        codigo: orden.lote.codigo.toString(),
        cantidad_producida: orden.lote.cantidadProducida,
        producido_en: orden.lote.producidoEn.toISOString(),
      })
    : null;

  return {
    id: orden.id.toString(),
    variante_id: orden.varianteId.toString(),
    receta_id: orden.recetaId.toString(),
    planta_central_id: orden.plantaCentralId.toString(),
    cantidad_a_producir: orden.cantidadAProducir,
    estado: orden.estado,
    bom: JSON.stringify(bomJson),
    mermas: JSON.stringify(mermasJson),
    lote: loteJson,
    creada_por: orden.creadaPor.toString(),
    creada_en: orden.creadaEn.toISOString(),
    actualizada_en: new Date().toISOString(),
  };
}

// ── DespachoAPunto ────────────────────────────────────────────

export interface DispatchRowParsed {
  id: string;
  orden_id: string;
  codigo_lote: string;
  cantidad_despachada: number;
  lote_cantidad_total: number;
  planta_central_id: string;
  punto_de_venta_destino_id: string;
  estado: string;
  preparado_por: string;
  creado_en: Date | string;
}

export function rowToDespacho(row: DispatchRowParsed): DespachoAPunto {
  const codigoRes = CodigoDeLote.of(row.codigo_lote);
  if (!codigoRes.ok)
    throw new Error(`production mapper: CodigoDeLote inválido: ${row.codigo_lote}`);

  return DespachoAPunto.reconstituir({
    id: mustId(DespachoId.of(row.id), 'DespachoId'),
    ordenId: mustId(OrdenDeProduccionId.of(row.orden_id), 'OrdenDeProduccionId'),
    codigoLote: codigoRes.value,
    cantidadDespachada: row.cantidad_despachada,
    loteCantidadTotal: row.lote_cantidad_total,
    plantaCentralId: mustId(BusinessUnitIdRef.of(row.planta_central_id), 'BusinessUnitIdRef'),
    puntoDeVentaDestinoId: mustId(
      BusinessUnitIdRef.of(row.punto_de_venta_destino_id),
      'BusinessUnitIdRef',
    ),
    estado: row.estado as EstadoDeDespacho,
    preparadoPor: mustId(UsuarioIdRef.of(row.preparado_por), 'UsuarioIdRef'),
    creadoEn: toFechaHora(row.creado_en),
  });
}

export function despachoToInsertRow(despacho: DespachoAPunto) {
  return {
    id: despacho.id.toString(),
    orden_id: despacho.ordenId.toString(),
    codigo_lote: despacho.codigoLote.toString(),
    cantidad_despachada: despacho.cantidadDespachada,
    lote_cantidad_total: despacho.loteCantidadTotal,
    planta_central_id: despacho.plantaCentralId.toString(),
    punto_de_venta_destino_id: despacho.puntoDeVentaDestinoId.toString(),
    estado: despacho.estado,
    preparado_por: despacho.preparadoPor.toString(),
    creado_en: despacho.creadoEn.toISOString(),
    actualizado_en: new Date().toISOString(),
  };
}
