import { describe, it, expect } from 'vitest';
import { FechaHora } from '@zahavi/domain-shared-kernel';
import { StockAlert } from '../../aggregates/StockAlert.js';
import { StockAlertId, IngredientId, BusinessUnitId } from '../../value-objects/ids.js';
import { EstadoDeAlerta, UnidadNativa } from '../../value-objects/enums.js';
import { AlertaNoAbiertaError } from '../../errors/index.js';

const ALERTA_ID = '00000000-0000-0000-0000-000000000030';
const ING_ID = '00000000-0000-0000-0000-000000000031';
const BU_ID = '00000000-0000-0000-0000-000000000032';
const EVT = '00000000-0000-0000-0000-0000000000cc';
const AHORA = FechaHora.deTimestamp(1_700_000_000_000);
const LUEGO = FechaHora.deTimestamp(1_700_000_100_000);

function unwrap<T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!r.ok) throw new Error(`Esperaba ok, recibí: ${JSON.stringify(r.error)}`);
  return r.value;
}

const alertaId = () => unwrap(StockAlertId.of(ALERTA_ID));
const ingredientId = () => unwrap(IngredientId.of(ING_ID));
const businessUnitId = () => unwrap(BusinessUnitId.of(BU_ID));

function abrir(): StockAlert {
  return unwrap(
    StockAlert.abrir(
      {
        id: alertaId(),
        ingredientId: ingredientId(),
        businessUnitId: businessUnitId(),
        stockAlMomento: 2,
        umbralAlMomento: 10,
        unidad: UnidadNativa.KILOGRAMO,
        ahora: AHORA,
      },
      EVT,
    ),
  );
}

describe('StockAlert.abrir', () => {
  it('crea la alerta en estado ABIERTA', () => {
    const a = abrir();
    expect(a.estado).toBe(EstadoDeAlerta.ABIERTA);
    expect(a.estaAbierta()).toBe(true);
    expect(a.stockAlMomento).toBe(2);
    expect(a.umbralAlMomento).toBe(10);
    expect(a.cierreEn).toBeNull();
  });

  it('emite AlertaDeStockAbierta', () => {
    const eventos = abrir().pullDomainEvents();
    expect(eventos).toHaveLength(1);
    expect(eventos[0]?.tipo).toBe('AlertaDeStockAbierta');
    if (eventos[0]?.tipo === 'AlertaDeStockAbierta') {
      expect(eventos[0].payload.alertaId).toBe(ALERTA_ID);
      expect(eventos[0].payload.stockActual).toBe(2);
      expect(eventos[0].payload.umbral).toBe(10);
    }
  });
});

describe('StockAlert.cerrar', () => {
  it('cierra una alerta abierta y registra el instante de cierre', () => {
    const a = unwrap(abrir().cerrar(LUEGO, EVT));
    expect(a.estado).toBe(EstadoDeAlerta.CERRADA);
    expect(a.estaAbierta()).toBe(false);
    expect(a.cierreEn?.toTimestamp()).toBe(LUEGO.toTimestamp());
    expect(a.pullDomainEvents().map((e) => e.tipo)).toContain('AlertaDeStockCerrada');
  });

  it('cerrar una alerta ya cerrada retorna AlertaNoAbiertaError', () => {
    const cerrada = unwrap(abrir().cerrar(LUEGO, EVT));
    const r = cerrada.cerrar(LUEGO, EVT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(AlertaNoAbiertaError);
  });

  it('no muta la alerta original', () => {
    const a = abrir();
    a.cerrar(LUEGO, EVT);
    expect(a.estado).toBe(EstadoDeAlerta.ABIERTA);
  });
});

describe('StockAlert.anular', () => {
  it('anula una alerta abierta', () => {
    const a = unwrap(abrir().anular(LUEGO, EVT));
    expect(a.estado).toBe(EstadoDeAlerta.ANULADA);
    expect(a.cierreEn?.toTimestamp()).toBe(LUEGO.toTimestamp());
    expect(a.pullDomainEvents().map((e) => e.tipo)).toContain('AlertaDeStockAnulada');
  });

  it('anular una alerta cerrada retorna AlertaNoAbiertaError', () => {
    const cerrada = unwrap(abrir().cerrar(LUEGO, EVT));
    const r = cerrada.anular(LUEGO, EVT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(AlertaNoAbiertaError);
  });

  it('anular una alerta ya anulada retorna AlertaNoAbiertaError', () => {
    const anulada = unwrap(abrir().anular(LUEGO, EVT));
    const r = anulada.anular(LUEGO, EVT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(AlertaNoAbiertaError);
  });
});

describe('StockAlert.reconstituir', () => {
  it('reconstituye sin eventos', () => {
    const a = StockAlert.reconstituir({
      id: alertaId(),
      ingredientId: ingredientId(),
      businessUnitId: businessUnitId(),
      stockAlMomento: 1,
      umbralAlMomento: 5,
      unidad: UnidadNativa.UNIDAD,
      estado: EstadoDeAlerta.CERRADA,
      creadaEn: AHORA,
      cierreEn: LUEGO,
    });
    expect(a.pullDomainEvents()).toHaveLength(0);
    expect(a.estado).toBe(EstadoDeAlerta.CERRADA);
  });
});
