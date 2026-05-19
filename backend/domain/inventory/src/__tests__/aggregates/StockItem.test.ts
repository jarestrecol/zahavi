import { describe, it, expect } from 'vitest';
import { Money, FechaHora } from '@zahavi/domain-shared-kernel';
import { StockItem } from '../../aggregates/StockItem.js';
import {
  StockItemId,
  IngredientId,
  BusinessUnitId,
  StockMovementId,
  SupplierId,
  StockAlertId,
} from '../../value-objects/ids.js';
import { UnidadNativa, TipoMovimiento } from '../../value-objects/enums.js';
import { StockNegativoError, AjusteSinJustificacionError } from '../../errors/index.js';

const STOCK_ITEM_ID = '00000000-0000-0000-0000-000000000010';
const ING_ID = '00000000-0000-0000-0000-000000000011';
const BU_ID = '00000000-0000-0000-0000-000000000012';
const MOV_ID = '00000000-0000-0000-0000-000000000013';
const SUP_ID = '00000000-0000-0000-0000-000000000014';
const ALERTA_ID = '00000000-0000-0000-0000-000000000015';
const EVT = '00000000-0000-0000-0000-0000000000ee';
const AHORA = FechaHora.deTimestamp(1_700_000_000_000);
const LUEGO = FechaHora.deTimestamp(1_700_000_100_000);

function unwrap<T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!r.ok) throw new Error(`Esperaba ok, recibí: ${JSON.stringify(r.error)}`);
  return r.value;
}

const ingredientId = () => unwrap(IngredientId.of(ING_ID));
const businessUnitId = () => unwrap(BusinessUnitId.of(BU_ID));
const stockItemId = () => unwrap(StockItemId.of(STOCK_ITEM_ID));
const movId = () => unwrap(StockMovementId.of(MOV_ID));
const supId = () => unwrap(SupplierId.of(SUP_ID));
const alertaId = () => unwrap(StockAlertId.of(ALERTA_ID));
const money = (v: number) => unwrap(Money.deCop(v));

function nuevo(): StockItem {
  return unwrap(
    StockItem.crear(
      {
        id: stockItemId(),
        ingredientId: ingredientId(),
        businessUnitId: businessUnitId(),
        unidadNativa: UnidadNativa.KILOGRAMO,
        ahora: AHORA,
      },
      EVT,
    ),
  );
}

describe('StockItem.crear', () => {
  it('crea con cantidad 0, costo 0 y versión 1', () => {
    const si = nuevo();
    expect(si.cantidadDisponible).toBe(0);
    expect(si.costoPromedioUnitario.toCop()).toBe(0);
    expect(si.version).toBe(1);
    expect(si.unidadNativa).toBe(UnidadNativa.KILOGRAMO);
  });

  it('emite StockItemCreado', () => {
    const eventos = nuevo().pullDomainEvents();
    expect(eventos).toHaveLength(1);
    expect(eventos[0]?.tipo).toBe('StockItemCreado');
    if (eventos[0]?.tipo === 'StockItemCreado') {
      expect(eventos[0].payload.cantidadInicial).toBe(0);
      expect(eventos[0].payload.ingredientId).toBe(ING_ID);
      expect(eventos[0].payload.businessUnitId).toBe(BU_ID);
    }
  });
});

describe('StockItem.registrarIngreso', () => {
  it('incrementa la cantidad disponible', () => {
    const si = unwrap(nuevo().registrarIngreso(25, money(3500), movId(), supId(), AHORA, EVT));
    expect(si.cantidadDisponible).toBe(25);
    expect(si.version).toBe(2);
  });

  it('fija el costo promedio en el costo del primer ingreso', () => {
    const si = unwrap(nuevo().registrarIngreso(10, money(3000), movId(), supId(), AHORA, EVT));
    expect(si.costoPromedioUnitario.toCop()).toBe(3000);
  });

  it('recalcula el costo promedio ponderado en ingresos sucesivos', () => {
    // 10 kg @ 3000  +  30 kg @ 3500  ->  (10*3000 + 30*3500) / 40 = 135000/40 = 3375
    const si1 = unwrap(nuevo().registrarIngreso(10, money(3000), movId(), supId(), AHORA, EVT));
    const si2 = unwrap(si1.registrarIngreso(30, money(3500), movId(), supId(), LUEGO, EVT));
    expect(si2.cantidadDisponible).toBe(40);
    expect(si2.costoPromedioUnitario.toCop()).toBe(3375);
    expect(si2.version).toBe(3);
  });

  it('redondea el costo promedio ponderado a COP entero', () => {
    // 3 kg @ 1000  +  1 kg @ 1100  ->  (3000 + 1100) / 4 = 1025
    const si1 = unwrap(nuevo().registrarIngreso(3, money(1000), movId(), supId(), AHORA, EVT));
    const si2 = unwrap(si1.registrarIngreso(1, money(1100), movId(), supId(), LUEGO, EVT));
    expect(si2.costoPromedioUnitario.toCop()).toBe(1025);
  });

  it('emite CompraRegistrada con supplierId y costoUnitario', () => {
    const si = unwrap(nuevo().registrarIngreso(5, money(2000), movId(), supId(), AHORA, EVT));
    const compra = si.pullDomainEvents().find((e) => e.tipo === 'CompraRegistrada');
    expect(compra).toBeDefined();
    if (compra && compra.tipo === 'CompraRegistrada') {
      expect(compra.payload.cantidad).toBe(5);
      expect(compra.payload.costoUnitario).toBe(2000);
      expect(compra.payload.supplierId).toBe(SUP_ID);
      expect(compra.payload.movimientoId).toBe(MOV_ID);
    }
  });

  it('rechaza cantidad cero o negativa con StockNegativoError', () => {
    const r1 = nuevo().registrarIngreso(0, money(1000), movId(), supId(), AHORA, EVT);
    const r2 = nuevo().registrarIngreso(-3, money(1000), movId(), supId(), AHORA, EVT);
    expect(r1.ok).toBe(false);
    expect(r2.ok).toBe(false);
    if (!r1.ok) expect(r1.error).toBeInstanceOf(StockNegativoError);
  });

  it('no muta el agregado original (inmutabilidad)', () => {
    const si = nuevo();
    si.registrarIngreso(10, money(1000), movId(), supId(), AHORA, EVT);
    expect(si.cantidadDisponible).toBe(0);
    expect(si.version).toBe(1);
  });
});

describe('StockItem.registrarSalida', () => {
  function conStock(cantidad: number): StockItem {
    return unwrap(nuevo().registrarIngreso(cantidad, money(1000), movId(), supId(), AHORA, EVT));
  }

  it('decrementa la cantidad por consumo de producción', () => {
    const si = unwrap(
      conStock(20).registrarSalida(
        8,
        TipoMovimiento.PRODUCTION_OUT,
        'orden-prod-1',
        movId(),
        LUEGO,
        EVT,
      ),
    );
    expect(si.cantidadDisponible).toBe(12);
    expect(si.version).toBe(3);
  });

  it('emite SalidaDeProduccionRegistrada para PRODUCTION_OUT', () => {
    const si = unwrap(
      conStock(20).registrarSalida(
        8,
        TipoMovimiento.PRODUCTION_OUT,
        'orden-prod-1',
        movId(),
        LUEGO,
        EVT,
      ),
    );
    const ev = si.pullDomainEvents().find((e) => e.tipo === 'SalidaDeProduccionRegistrada');
    expect(ev).toBeDefined();
    if (ev && ev.tipo === 'SalidaDeProduccionRegistrada') {
      expect(ev.payload.referenciaProduccion).toBe('orden-prod-1');
      expect(ev.payload.cantidad).toBe(8);
    }
  });

  it('emite MermaRegistrada para WASTE con el motivo', () => {
    const si = unwrap(
      conStock(20).registrarSalida(
        5,
        TipoMovimiento.WASTE,
        'producto vencido',
        movId(),
        LUEGO,
        EVT,
      ),
    );
    const ev = si.pullDomainEvents().find((e) => e.tipo === 'MermaRegistrada');
    expect(ev).toBeDefined();
    if (ev && ev.tipo === 'MermaRegistrada') {
      expect(ev.payload.motivo).toBe('producto vencido');
      expect(ev.payload.cantidad).toBe(5);
    }
    expect(si.cantidadDisponible).toBe(15);
  });

  it('permite salir exactamente todo el stock disponible (queda en 0)', () => {
    const si = unwrap(
      conStock(7).registrarSalida(7, TipoMovimiento.PRODUCTION_OUT, 'ref', movId(), LUEGO, EVT),
    );
    expect(si.cantidadDisponible).toBe(0);
  });

  it('rechaza salida mayor que el stock disponible con StockNegativoError', () => {
    const r = conStock(7).registrarSalida(
      8,
      TipoMovimiento.PRODUCTION_OUT,
      'ref',
      movId(),
      LUEGO,
      EVT,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(StockNegativoError);
  });

  it('rechaza cantidad cero', () => {
    const r = conStock(7).registrarSalida(0, TipoMovimiento.WASTE, 'ref', movId(), LUEGO, EVT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(StockNegativoError);
  });

  it('no muta el agregado original', () => {
    const si = conStock(10);
    si.registrarSalida(3, TipoMovimiento.PRODUCTION_OUT, 'ref', movId(), LUEGO, EVT);
    expect(si.cantidadDisponible).toBe(10);
  });
});

describe('StockItem.ajustar', () => {
  function conStock(cantidad: number): StockItem {
    return unwrap(nuevo().registrarIngreso(cantidad, money(1000), movId(), supId(), AHORA, EVT));
  }

  it('fuerza el stock a un nuevo valor', () => {
    const si = unwrap(conStock(20).ajustar(13, 'recount físico', movId(), LUEGO, EVT));
    expect(si.cantidadDisponible).toBe(13);
    expect(si.version).toBe(3);
  });

  it('permite ajustar a cero', () => {
    const si = unwrap(conStock(20).ajustar(0, 'inventario perdido', movId(), LUEGO, EVT));
    expect(si.cantidadDisponible).toBe(0);
  });

  it('emite AjusteRegistrado con cantidades anterior y nueva y el motivo', () => {
    const si = unwrap(conStock(20).ajustar(13, '  recount  ', movId(), LUEGO, EVT));
    const ev = si.pullDomainEvents().find((e) => e.tipo === 'AjusteRegistrado');
    expect(ev).toBeDefined();
    if (ev && ev.tipo === 'AjusteRegistrado') {
      expect(ev.payload.cantidadAnterior).toBe(20);
      expect(ev.payload.cantidadNueva).toBe(13);
      expect(ev.payload.motivo).toBe('recount');
    }
  });

  it('rechaza ajuste sin motivo con AjusteSinJustificacionError', () => {
    const r1 = conStock(20).ajustar(13, '', movId(), LUEGO, EVT);
    const r2 = conStock(20).ajustar(13, '   ', movId(), LUEGO, EVT);
    expect(r1.ok).toBe(false);
    expect(r2.ok).toBe(false);
    if (!r1.ok) expect(r1.error).toBeInstanceOf(AjusteSinJustificacionError);
  });

  it('rechaza ajuste a cantidad negativa con StockNegativoError', () => {
    const r = conStock(20).ajustar(-1, 'corrección', movId(), LUEGO, EVT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(StockNegativoError);
  });

  it('no muta el agregado original', () => {
    const si = conStock(20);
    si.ajustar(5, 'recount', movId(), LUEGO, EVT);
    expect(si.cantidadDisponible).toBe(20);
  });
});

describe('StockItem.verificarAlerta', () => {
  function conStock(cantidad: number): StockItem {
    return unwrap(nuevo().registrarIngreso(cantidad, money(1000), movId(), supId(), AHORA, EVT));
  }

  it('emite AlertaDeStockAbierta cuando el stock está por debajo del umbral', () => {
    const si = conStock(3);
    const { stockItem, alertaEmitida } = si.verificarAlerta(10, alertaId(), LUEGO, EVT);
    expect(alertaEmitida).toBe(true);
    const ev = stockItem.pullDomainEvents().find((e) => e.tipo === 'AlertaDeStockAbierta');
    expect(ev).toBeDefined();
    if (ev && ev.tipo === 'AlertaDeStockAbierta') {
      expect(ev.payload.stockActual).toBe(3);
      expect(ev.payload.umbral).toBe(10);
      expect(ev.payload.alertaId).toBe(ALERTA_ID);
    }
  });

  it('no emite alerta cuando el stock es igual o mayor que el umbral', () => {
    const si = conStock(10);
    const r = si.verificarAlerta(10, alertaId(), LUEGO, EVT);
    expect(r.alertaEmitida).toBe(false);
    expect(r.stockItem.pullDomainEvents().some((e) => e.tipo === 'AlertaDeStockAbierta')).toBe(
      false,
    );
  });

  it('no emite alerta cuando el umbral es cero (deshabilitado)', () => {
    // stock en 0 se obtiene directamente del aggregate recién creado (sin ingresos)
    const si = nuevo();
    const r = si.verificarAlerta(0, alertaId(), LUEGO, EVT);
    expect(r.alertaEmitida).toBe(false);
  });

  it('verificarAlerta no incrementa la versión', () => {
    const si = conStock(3);
    const { stockItem } = si.verificarAlerta(10, alertaId(), LUEGO, EVT);
    expect(stockItem.version).toBe(si.version);
  });

  it('estaBajoUmbral refleja el estado de stock', () => {
    expect(conStock(3).estaBajoUmbral(10)).toBe(true);
    expect(conStock(10).estaBajoUmbral(10)).toBe(false);
    expect(conStock(3).estaBajoUmbral(0)).toBe(false);
  });
});

describe('StockItem.reconstituir', () => {
  it('reconstituye sin eventos y conserva todos los campos', () => {
    const si = StockItem.reconstituir({
      id: stockItemId(),
      ingredientId: ingredientId(),
      businessUnitId: businessUnitId(),
      cantidadDisponible: 42,
      unidadNativa: UnidadNativa.GRAMO,
      costoPromedioUnitario: money(7),
      version: 9,
      actualizadoEn: AHORA,
    });
    expect(si.pullDomainEvents()).toHaveLength(0);
    expect(si.cantidadDisponible).toBe(42);
    expect(si.version).toBe(9);
    expect(si.costoPromedioUnitario.toCop()).toBe(7);
  });
});
