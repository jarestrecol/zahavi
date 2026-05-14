import { describe, it, expect } from 'vitest';
import { FechaHora } from '@zahavi/domain-shared-kernel';
import {
  Mesa,
  MesaId,
  ComandaId,
  BusinessUnitIdRef,
  NombreMesa,
  EstadoDeMesa,
  TipoDeMesa,
} from '../index.js';

const CID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const AHORA = FechaHora.deTimestamp(1_700_000_000_000);

function puntoId(): BusinessUnitIdRef {
  const r = BusinessUnitIdRef.of('dddddddd-dddd-dddd-dddd-dddddddddddd');
  if (!r.ok) throw new Error('puntoId inválido');
  return r.value;
}

function mesaId(): MesaId {
  const r = MesaId.of('11111111-1111-1111-1111-111111111111');
  if (!r.ok) throw new Error('mesaId inválido');
  return r.value;
}

function nombre(n = 'Mesa 1'): NombreMesa {
  const r = NombreMesa.of(n);
  if (!r.ok) throw new Error('nombre inválido');
  return r.value;
}

function comandaId(): ComandaId {
  const r = ComandaId.of('22222222-2222-2222-2222-222222222222');
  if (!r.ok) throw new Error('comandaId inválido');
  return r.value;
}

function mesaLibre(): Mesa {
  return Mesa.configurar(
    { id: mesaId(), nombre: nombre(), puntoDeVentaId: puntoId(), ahora: AHORA },
    CID,
  );
}

describe('Mesa', () => {
  describe('configurar', () => {
    it('nace en estado LIBRE con tipo NORMAL', () => {
      const mesa = mesaLibre();
      expect(mesa.estado).toBe(EstadoDeMesa.LIBRE);
      expect(mesa.tipo).toBe(TipoDeMesa.NORMAL);
      expect(mesa.comandaActivaId).toBeNull();
      expect(mesa.events).toHaveLength(1);
      expect(mesa.events.at(0)?.type).toBe('MesaConfigurada');
    });
  });

  describe('abrirAdHoc', () => {
    it('nace en estado OCUPADA con tipo AD_HOC', () => {
      const mesa = Mesa.abrirAdHoc(
        {
          id: mesaId(),
          nombre: nombre('Mostrador'),
          puntoDeVentaId: puntoId(),
          comandaId: comandaId(),
          ahora: AHORA,
        },
        CID,
      );
      expect(mesa.estado).toBe(EstadoDeMesa.OCUPADA);
      expect(mesa.tipo).toBe(TipoDeMesa.AD_HOC);
      expect(mesa.comandaActivaId).not.toBeNull();
    });
  });

  describe('ocupar', () => {
    it('LIBRE → OCUPADA y asigna comandaActivaId', () => {
      const result = mesaLibre().ocupar(comandaId(), AHORA, CID);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.estado).toBe(EstadoDeMesa.OCUPADA);
      expect(result.value.comandaActivaId).not.toBeNull();
    });

    it('rechaza ocupar mesa ya OCUPADA', () => {
      const mesa = mesaLibre().ocupar(comandaId(), AHORA, CID);
      expect(mesa.ok).toBe(true);
      if (!mesa.ok) return;
      const result = mesa.value.ocupar(comandaId(), AHORA, CID);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('SALES_MESA_YA_OCUPADA');
    });

    it('rechaza ocupar desde EN_COBRO', () => {
      const r1 = mesaLibre().ocupar(comandaId(), AHORA, CID);
      if (!r1.ok) throw new Error('setup falló');
      const r2 = r1.value.iniciarCobro(AHORA, CID);
      if (!r2.ok) throw new Error('setup falló');
      const r3 = r2.value.ocupar(comandaId(), AHORA, CID);
      expect(r3.ok).toBe(false);
      if (!r3.ok) expect(r3.error.code).toBe('SALES_TRANSICION_MESA_INVALIDA');
    });
  });

  describe('iniciarCobro', () => {
    it('OCUPADA → EN_COBRO', () => {
      const r1 = mesaLibre().ocupar(comandaId(), AHORA, CID);
      if (!r1.ok) throw new Error('setup falló');
      const r2 = r1.value.iniciarCobro(AHORA, CID);
      expect(r2.ok).toBe(true);
      if (!r2.ok) return;
      expect(r2.value.estado).toBe(EstadoDeMesa.EN_COBRO);
    });

    it('rechaza desde LIBRE', () => {
      const result = mesaLibre().iniciarCobro(AHORA, CID);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('SALES_TRANSICION_MESA_INVALIDA');
    });
  });

  describe('liberar', () => {
    it('OCUPADA → LIBRE limpia comandaActivaId', () => {
      const r1 = mesaLibre().ocupar(comandaId(), AHORA, CID);
      if (!r1.ok) throw new Error('setup falló');
      const r2 = r1.value.liberar(AHORA, CID);
      expect(r2.ok).toBe(true);
      if (!r2.ok) return;
      expect(r2.value.estado).toBe(EstadoDeMesa.LIBRE);
      expect(r2.value.comandaActivaId).toBeNull();
    });

    it('EN_COBRO → LIBRE', () => {
      const r1 = mesaLibre().ocupar(comandaId(), AHORA, CID);
      if (!r1.ok) throw new Error('setup falló');
      const r2 = r1.value.iniciarCobro(AHORA, CID);
      if (!r2.ok) throw new Error('setup falló');
      const r3 = r2.value.liberar(AHORA, CID);
      expect(r3.ok).toBe(true);
    });

    it('rechaza liberar mesa ya LIBRE', () => {
      const result = mesaLibre().liberar(AHORA, CID);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('SALES_TRANSICION_MESA_INVALIDA');
    });
  });

  describe('cancelarCobro', () => {
    it('EN_COBRO → OCUPADA', () => {
      const r1 = mesaLibre().ocupar(comandaId(), AHORA, CID);
      if (!r1.ok) throw new Error('setup falló');
      const r2 = r1.value.iniciarCobro(AHORA, CID);
      if (!r2.ok) throw new Error('setup falló');
      const r3 = r2.value.cancelarCobro(AHORA, CID);
      expect(r3.ok).toBe(true);
      if (!r3.ok) return;
      expect(r3.value.estado).toBe(EstadoDeMesa.OCUPADA);
    });
  });
});
