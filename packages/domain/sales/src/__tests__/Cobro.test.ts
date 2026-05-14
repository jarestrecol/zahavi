import { describe, it, expect } from 'vitest';
import { FechaHora } from '@zahavi/domain-shared-kernel';
import {
  Cobro,
  CobroId,
  ComandaId,
  BusinessUnitIdRef,
  UsuarioIdRef,
  Dinero,
  PagoDetalle,
  MetodoDePago,
  EstadoDeCobro,
} from '../index.js';

const CID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const AHORA = FechaHora.deTimestamp(1_700_000_000_000);

function unwrap<T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!r.ok)
    throw new Error(`unwrap falló: ${JSON.stringify((r as { ok: false; error: unknown }).error)}`);
  return r.value;
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
function cajeroId(): UsuarioIdRef {
  return unwrap(UsuarioIdRef.of('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'));
}
function total(v: number): Dinero {
  return unwrap(Dinero.de(v));
}

function cobroPendiente(totalComanda = 15000): Cobro {
  return Cobro.crear(
    {
      id: cobroId(),
      comandaId: comandaId(),
      puntoDeVentaId: puntoId(),
      totalComanda: total(totalComanda),
      cobradoPor: cajeroId(),
      ahora: AHORA,
    },
    CID,
  );
}

function pago(metodo: MetodoDePago, monto: number): PagoDetalle {
  return PagoDetalle.crear(metodo, unwrap(Dinero.de(monto)));
}

describe('Cobro', () => {
  describe('crear', () => {
    it('nace en estado PENDIENTE con totalCobrado = 0', () => {
      const c = cobroPendiente();
      expect(c.estado).toBe(EstadoDeCobro.PENDIENTE);
      expect(c.pagos).toHaveLength(0);
      expect(c.totalCobrado.valor).toBe(0);
      expect(c.cambio.valor).toBe(0);
    });
  });

  describe('procesar', () => {
    it('procesa con pago exacto — cambio = 0', () => {
      const result = cobroPendiente(15000).procesar(
        [pago(MetodoDePago.EFECTIVO, 15000)],
        AHORA,
        CID,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.estado).toBe(EstadoDeCobro.PROCESADO);
      expect(result.value.cambio.valor).toBe(0);
      expect(result.value.totalCobrado.valor).toBe(15000);
    });

    it('calcula cambio correctamente cuando se paga de más', () => {
      const result = cobroPendiente(15000).procesar(
        [pago(MetodoDePago.EFECTIVO, 20000)],
        AHORA,
        CID,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.cambio.valor).toBe(5000);
    });

    it('permite pago mixto (efectivo + NEQUI)', () => {
      const pagos = [pago(MetodoDePago.EFECTIVO, 10000), pago(MetodoDePago.NEQUI, 5000)];
      const result = cobroPendiente(15000).procesar(pagos, AHORA, CID);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.pagos).toHaveLength(2);
      expect(result.value.totalCobrado.valor).toBe(15000);
    });

    it('rechaza si totalCobrado < totalComanda', () => {
      const result = cobroPendiente(15000).procesar(
        [pago(MetodoDePago.EFECTIVO, 10000)],
        AHORA,
        CID,
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('SALES_COBRO_INCOMPLETO');
    });

    it('rechaza lista de pagos vacía', () => {
      const result = cobroPendiente(15000).procesar([], AHORA, CID);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('SALES_PAGOS_VACIOS');
    });

    it('rechaza doble procesamiento', () => {
      const c = unwrap(
        cobroPendiente(15000).procesar([pago(MetodoDePago.EFECTIVO, 15000)], AHORA, CID),
      );
      const result = c.procesar([pago(MetodoDePago.EFECTIVO, 15000)], AHORA, CID);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('SALES_COBRO_YA_PROCESADO');
    });
  });

  describe('anular', () => {
    it('anula cobro PENDIENTE con motivo', () => {
      const result = cobroPendiente().anular('Error al registrar', AHORA, CID);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.estado).toBe(EstadoDeCobro.ANULADO);
      expect(result.value.motivoAnulacion).toBe('Error al registrar');
    });

    it('anula cobro PROCESADO (devolución)', () => {
      const cobro = unwrap(
        cobroPendiente(15000).procesar([pago(MetodoDePago.EFECTIVO, 15000)], AHORA, CID),
      );
      const result = cobro.anular('Devolución al cliente', AHORA, CID);
      expect(result.ok).toBe(true);
    });

    it('rechaza anular cobro ya ANULADO', () => {
      const c = unwrap(cobroPendiente().anular('motivo', AHORA, CID));
      const result = c.anular('otro motivo', AHORA, CID);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('SALES_COBRO_NO_ANULABLE');
    });

    it('rechaza anulación sin motivo', () => {
      const result = cobroPendiente().anular('', AHORA, CID);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('SALES_CANCELACION_SIN_MOTIVO');
    });
  });
});
