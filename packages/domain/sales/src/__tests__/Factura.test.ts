import { describe, it, expect } from 'vitest';
import { FechaHora } from '@zahavi/domain-shared-kernel';
import {
  Factura,
  FacturaId,
  CobroId,
  ComandaId,
  BusinessUnitIdRef,
  ProductVariantIdRef,
  NumeroFactura,
  FacturaLinea,
  Dinero,
  TasaIVA,
  EstadoDeFactura,
} from '../index.js';

const CID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const AHORA = FechaHora.deTimestamp(1_700_000_000_000);

function unwrap<T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!r.ok)
    throw new Error(`unwrap falló: ${JSON.stringify((r as { ok: false; error: unknown }).error)}`);
  return r.value;
}

function facturaId(): FacturaId {
  return unwrap(FacturaId.of('44444444-4444-4444-4444-444444444444'));
}
function cobroId(): CobroId {
  return unwrap(CobroId.of('33333333-3333-3333-3333-333333333333'));
}
function comandaId(): ComandaId {
  return unwrap(ComandaId.of('22222222-2222-2222-2222-222222222222'));
}
function puntoId(): BusinessUnitIdRef {
  return unwrap(BusinessUnitIdRef.of('dddddddd-dddd-dddd-dddd-dddddddddddd'));
}
function numero(n = 'FAC-2026-00001'): NumeroFactura {
  return unwrap(NumeroFactura.of(n));
}

const LINEAS: FacturaLinea[] = [
  FacturaLinea.crear({
    varianteId: unwrap(ProductVariantIdRef.of('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')),
    nombreProducto: 'Croissant de mantequilla',
    cantidad: 2,
    precioUnitario: unwrap(Dinero.de(4500)),
    tasaIVA: TasaIVA.CERO,
  }),
  FacturaLinea.crear({
    varianteId: unwrap(ProductVariantIdRef.of('cccccccc-cccc-cccc-cccc-cccccccccccc')),
    nombreProducto: 'Café americano',
    cantidad: 1,
    precioUnitario: unwrap(Dinero.de(3000)),
    tasaIVA: TasaIVA.IVA_19,
  }),
];

function facturaEmitida(): Factura {
  return Factura.emitir(
    {
      id: facturaId(),
      cobroId: cobroId(),
      comandaId: comandaId(),
      puntoDeVentaId: puntoId(),
      numero: numero(),
      lineas: LINEAS,
      ahora: AHORA,
    },
    CID,
  );
}

describe('Factura', () => {
  describe('emitir', () => {
    it('calcula subtotal, IVA y total correctamente', () => {
      const f = facturaEmitida();
      expect(f.estado).toBe(EstadoDeFactura.EMITIDA);
      // 2 × $4500 = $9000 (0% IVA) + 1 × $3000 = $3000 + $570 IVA = $3570
      expect(f.subtotal.valor).toBe(12000);
      expect(f.totalIVA.valor).toBe(570);
      expect(f.total.valor).toBe(12570);
      expect(f.lineas).toHaveLength(2);
    });

    it('emite con número de factura correcto', () => {
      const f = facturaEmitida();
      expect(f.numero.toString()).toBe('FAC-2026-00001');
    });

    it('emite evento FacturaEmitida', () => {
      const f = facturaEmitida();
      expect(f.events).toHaveLength(1);
      expect(f.events.at(0)?.type).toBe('FacturaEmitida');
    });
  });

  describe('anular', () => {
    it('anula con motivo válido', () => {
      const result = facturaEmitida().anular('Pedido duplicado', AHORA, CID);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.estado).toBe(EstadoDeFactura.ANULADA);
      expect(result.value.motivoAnulacion).toBe('Pedido duplicado');
      expect(result.value.anuladaEn).not.toBeNull();
    });

    it('rechaza doble anulación', () => {
      const f = unwrap(facturaEmitida().anular('motivo', AHORA, CID));
      const result = f.anular('otro motivo', AHORA, CID);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('SALES_FACTURA_YA_ANULADA');
    });

    it('rechaza anulación sin motivo', () => {
      const result = facturaEmitida().anular('', AHORA, CID);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('SALES_CANCELACION_SIN_MOTIVO');
    });
  });

  describe('NumeroFactura', () => {
    it('rechaza número vacío', () => {
      const result = NumeroFactura.of('');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('SALES_NUMERO_FACTURA_INVALIDO');
    });

    it('rechaza número con solo espacios', () => {
      const result = NumeroFactura.of('   ');
      expect(result.ok).toBe(false);
    });
  });
});
