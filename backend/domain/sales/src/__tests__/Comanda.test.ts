import { describe, it, expect } from 'vitest';
import { FechaHora } from '@zahavi/domain-shared-kernel';
import {
  Comanda,
  ComandaId,
  MesaId,
  BusinessUnitIdRef,
  UsuarioIdRef,
  LineaDeComandaId,
  ProductVariantIdRef,
  Dinero,
  TasaIVA,
  EstadoDeComanda,
} from '../index.js';
import type { DatosDeProductoParaLinea } from '../index.js';

const CID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const AHORA = FechaHora.deTimestamp(1_700_000_000_000);

function unwrap<T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!r.ok)
    throw new Error(`unwrap falló: ${JSON.stringify((r as { ok: false; error: unknown }).error)}`);
  return r.value;
}

function comandaId(): ComandaId {
  return unwrap(ComandaId.of('22222222-2222-2222-2222-222222222222'));
}
function mesaId(): MesaId {
  return unwrap(MesaId.of('11111111-1111-1111-1111-111111111111'));
}
function puntoId(): BusinessUnitIdRef {
  return unwrap(BusinessUnitIdRef.of('dddddddd-dddd-dddd-dddd-dddddddddddd'));
}
function meseroId(): UsuarioIdRef {
  return unwrap(UsuarioIdRef.of('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'));
}
function lineaId(): LineaDeComandaId {
  return unwrap(LineaDeComandaId.of('55555555-5555-5555-5555-555555555555'));
}

const PRODUCTO: DatosDeProductoParaLinea = {
  varianteId: unwrap(ProductVariantIdRef.of('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')),
  nombreProducto: 'Croissant de mantequilla',
  precioUnitario: unwrap(Dinero.de(4500)),
  tasaIVA: TasaIVA.CERO,
};

function comandaAbierta(): Comanda {
  return Comanda.crear(
    {
      id: comandaId(),
      mesaId: mesaId(),
      puntoDeVentaId: puntoId(),
      tomadaPor: meseroId(),
      ahora: AHORA,
    },
    CID,
  );
}

function comandaConLinea(): Comanda {
  return unwrap(
    comandaAbierta().agregarLinea(
      { lineaId: lineaId(), producto: PRODUCTO, cantidad: 2, ahora: AHORA },
      CID,
    ),
  );
}

function comandaEnviada(): Comanda {
  return unwrap(comandaConLinea().enviar(AHORA, CID));
}

describe('Comanda', () => {
  describe('crear', () => {
    it('nace en estado ABIERTA sin líneas', () => {
      const c = comandaAbierta();
      expect(c.estado).toBe(EstadoDeComanda.ABIERTA);
      expect(c.lineas).toHaveLength(0);
      expect(c.totalConIVA.valor).toBe(0);
    });
  });

  describe('agregarLinea', () => {
    it('agrega línea y recalcula totales', () => {
      const c = comandaConLinea();
      expect(c.lineas).toHaveLength(1);
      // 2 × $4500 = $9000 sin IVA (tasaIVA = 0%)
      expect(c.totalConIVA.valor).toBe(9000);
      expect(c.totalIVA.valor).toBe(0);
    });

    it('calcula IVA correctamente al 19%', () => {
      const productoConIVA: DatosDeProductoParaLinea = {
        ...PRODUCTO,
        precioUnitario: unwrap(Dinero.de(10000)),
        tasaIVA: TasaIVA.IVA_19,
      };
      const c = unwrap(
        comandaAbierta().agregarLinea(
          { lineaId: lineaId(), producto: productoConIVA, cantidad: 1, ahora: AHORA },
          CID,
        ),
      );
      expect(c.totalSinIVA.valor).toBe(10000);
      expect(c.totalIVA.valor).toBe(1900);
      expect(c.totalConIVA.valor).toBe(11900);
    });

    it('rechaza cantidad = 0', () => {
      const result = comandaAbierta().agregarLinea(
        { lineaId: lineaId(), producto: PRODUCTO, cantidad: 0, ahora: AHORA },
        CID,
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('SALES_CANTIDAD_LINEA_INVALIDA');
    });

    it('rechaza cantidad negativa', () => {
      const result = comandaAbierta().agregarLinea(
        { lineaId: lineaId(), producto: PRODUCTO, cantidad: -1, ahora: AHORA },
        CID,
      );
      expect(result.ok).toBe(false);
    });

    it('rechaza agregar línea a comanda ENVIADA', () => {
      const result = comandaEnviada().agregarLinea(
        { lineaId: lineaId(), producto: PRODUCTO, cantidad: 1, ahora: AHORA },
        CID,
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('SALES_COMANDA_NO_MODIFICABLE');
    });
  });

  describe('cancelarLinea', () => {
    it('cancela la línea y la excluye del total', () => {
      const c = unwrap(comandaConLinea().cancelarLinea(lineaId(), AHORA, CID));
      expect(c.lineasActivas).toHaveLength(0);
      expect(c.totalConIVA.valor).toBe(0);
    });

    it('rechaza cancelar línea inexistente', () => {
      const idFalso = unwrap(LineaDeComandaId.of('99999999-9999-9999-9999-999999999999'));
      const result = comandaConLinea().cancelarLinea(idFalso, AHORA, CID);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('SALES_LINEA_NO_ENCONTRADA');
    });
  });

  describe('enviar', () => {
    it('ABIERTA con líneas → ENVIADA', () => {
      const result = comandaConLinea().enviar(AHORA, CID);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.estado).toBe(EstadoDeComanda.ENVIADA);
    });

    it('rechaza enviar sin líneas activas', () => {
      const result = comandaAbierta().enviar(AHORA, CID);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('SALES_COMANDA_SIN_LINEAS');
    });

    it('rechaza doble envío', () => {
      const result = unwrap(comandaConLinea().enviar(AHORA, CID)).enviar(AHORA, CID);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('SALES_TRANSICION_COMANDA_INVALIDA');
    });
  });

  describe('flujo completo ABIERTA→ENVIADA→EN_PREPARACION→LISTA→CERRADA', () => {
    it('transita correctamente por todos los estados', () => {
      const c0 = comandaConLinea();
      const c1 = unwrap(c0.enviar(AHORA, CID));
      const c2 = unwrap(c1.marcarEnPreparacion(AHORA, CID));
      const c3 = unwrap(c2.marcarLista(AHORA, CID));
      const c4 = unwrap(c3.cerrar(meseroId(), AHORA, CID));
      expect(c4.estado).toBe(EstadoDeComanda.CERRADA);
      expect(c4.cerradaPor).not.toBeNull();
    });

    it('rechaza cerrar desde ENVIADA (debe pasar por EN_PREPARACION y LISTA)', () => {
      const result = comandaEnviada().cerrar(meseroId(), AHORA, CID);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('SALES_TRANSICION_COMANDA_INVALIDA');
    });
  });

  describe('cancelar', () => {
    it('cancela desde ABIERTA con motivo', () => {
      const result = comandaConLinea().cancelar('Cliente se fue', meseroId(), AHORA, CID);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.estado).toBe(EstadoDeComanda.CANCELADA);
      expect(result.value.motivoCancelacion).toBe('Cliente se fue');
    });

    it('rechaza cancelar sin motivo', () => {
      const result = comandaConLinea().cancelar('', meseroId(), AHORA, CID);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('SALES_CANCELACION_SIN_MOTIVO');
    });

    it('rechaza cancelar comanda CERRADA', () => {
      const c0 = comandaConLinea();
      const c1 = unwrap(c0.enviar(AHORA, CID));
      const c2 = unwrap(c1.marcarEnPreparacion(AHORA, CID));
      const c3 = unwrap(c2.marcarLista(AHORA, CID));
      const c4 = unwrap(c3.cerrar(meseroId(), AHORA, CID));
      const result = c4.cancelar('error', meseroId(), AHORA, CID);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('SALES_TRANSICION_COMANDA_INVALIDA');
    });
  });
});
