import { describe, it, expect } from 'vitest';
import { FechaHora } from '@zahavi/domain-shared-kernel';
import { DespachoAPunto } from '../aggregates/DespachoAPunto.js';
import { CodigoDeLote } from '../value-objects/CodigoDeLote.js';
import { EstadoDeDespacho } from '../value-objects/enums.js';
import {
  DespachoId,
  OrdenDeProduccionId,
  BusinessUnitIdRef,
  UsuarioIdRef,
} from '../value-objects/ids.js';
import type { Result } from '../errors/DomainError.js';

function unwrap<T>(res: Result<T>): T {
  if (!res.ok) throw res.error;
  return res.value;
}

// ── Fixtures ───────────────────────────────────────────────────

const ahora = FechaHora.ahora();
const despachoId = DespachoId.nuevo();
const ordenId = OrdenDeProduccionId.nuevo();
const lote = unwrap(CodigoDeLote.of('LOTE-20260514-0001'));
const plantaId = unwrap(BusinessUnitIdRef.of(crypto.randomUUID()));
const puntoId = unwrap(BusinessUnitIdRef.of(crypto.randomUUID()));
const usuarioId = unwrap(UsuarioIdRef.of(crypto.randomUUID()));

function prepararDespacho(cantidadDespachada = 8, loteCantidadTotal = 10) {
  return DespachoAPunto.preparar(
    {
      id: despachoId,
      ordenId,
      codigoLote: lote,
      cantidadDespachada,
      loteCantidadTotal,
      plantaCentralId: plantaId,
      puntoDeVentaDestinoId: puntoId,
      preparadoPor: usuarioId,
      ahora,
    },
    crypto.randomUUID(),
  );
}

// ── Tests: preparar ────────────────────────────────────────────

describe('DespachoAPunto.preparar', () => {
  it('crea en estado PREPARADO y emite DespachoPreparado', () => {
    const despacho = unwrap(prepararDespacho());
    expect(despacho.estado).toBe(EstadoDeDespacho.PREPARADO);
    expect(despacho.pullDomainEvents()[0]?.tipo).toBe('DespachoPreparado');
  });

  it.each([0, -1, 0.5])('rechaza cantidadDespachada=%s', (n) => {
    const res = prepararDespacho(n);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('PRODUCTION_CANTIDAD_DESPACHADA_INVALIDA');
  });

  it('rechaza cantidadDespachada > loteCantidadTotal (invariante 2)', () => {
    const res = prepararDespacho(11, 10);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('PRODUCTION_CANTIDAD_DESPACHADA_EXCEDE_LOTE');
  });

  it('rechaza origen == destino (invariante 3)', () => {
    const res = DespachoAPunto.preparar(
      {
        id: despachoId,
        ordenId,
        codigoLote: lote,
        cantidadDespachada: 5,
        loteCantidadTotal: 10,
        plantaCentralId: plantaId,
        puntoDeVentaDestinoId: plantaId, // mismo que origen
        preparadoPor: usuarioId,
        ahora,
      },
      crypto.randomUUID(),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('PRODUCTION_DESTINO_DESPACHO_INVALIDO');
  });
});

// ── Tests: enviar ──────────────────────────────────────────────

describe('DespachoAPunto.enviar', () => {
  it('transiciona a EN_TRANSITO y emite DespachoEnviado', () => {
    const res = unwrap(prepararDespacho()).enviar(usuarioId, ahora, crypto.randomUUID());
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.estado).toBe(EstadoDeDespacho.EN_TRANSITO);
      expect(res.value.pullDomainEvents().at(-1)?.tipo).toBe('DespachoEnviado');
    }
  });

  it('rechaza si no está PREPARADO', () => {
    const enTransito = unwrap(
      unwrap(prepararDespacho()).enviar(usuarioId, ahora, crypto.randomUUID()),
    );
    const res = enTransito.enviar(usuarioId, ahora, crypto.randomUUID());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('PRODUCTION_DESPACHO_EN_ESTADO_INVALIDO');
  });
});

// ── Tests: entregar ────────────────────────────────────────────

describe('DespachoAPunto.entregar', () => {
  it('transiciona a ENTREGADO y emite DespachoEntregado', () => {
    const enTransito = unwrap(
      unwrap(prepararDespacho()).enviar(usuarioId, ahora, crypto.randomUUID()),
    );
    const res = enTransito.entregar(usuarioId, usuarioId, ahora, crypto.randomUUID());
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.estado).toBe(EstadoDeDespacho.ENTREGADO);
      expect(res.value.esTerminal()).toBe(true);
      expect(res.value.pullDomainEvents().at(-1)?.tipo).toBe('DespachoEntregado');
    }
  });

  it('rechaza si no está EN_TRANSITO', () => {
    const res = unwrap(prepararDespacho()).entregar(
      usuarioId,
      usuarioId,
      ahora,
      crypto.randomUUID(),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('PRODUCTION_DESPACHO_EN_ESTADO_INVALIDO');
  });
});

// ── Tests: cancelar ────────────────────────────────────────────

describe('DespachoAPunto.cancelar', () => {
  it('cancela desde PREPARADO', () => {
    const res = unwrap(prepararDespacho()).cancelar(
      'Cambio de turno',
      usuarioId,
      ahora,
      crypto.randomUUID(),
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.estado).toBe(EstadoDeDespacho.CANCELADO);
  });

  it('cancela desde EN_TRANSITO', () => {
    const enTransito = unwrap(
      unwrap(prepararDespacho()).enviar(usuarioId, ahora, crypto.randomUUID()),
    );
    const res = enTransito.cancelar('Accidente en tránsito', usuarioId, ahora, crypto.randomUUID());
    expect(res.ok).toBe(true);
  });

  it('rechaza sin motivo', () => {
    const res = unwrap(prepararDespacho()).cancelar('', usuarioId, ahora, crypto.randomUUID());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('PRODUCTION_CANCELACION_DESPACHO_SIN_JUSTIFICACION');
  });

  it('rechaza cancelar en ENTREGADO (terminal)', () => {
    const entregado = unwrap(
      unwrap(unwrap(prepararDespacho()).enviar(usuarioId, ahora, crypto.randomUUID())).entregar(
        usuarioId,
        usuarioId,
        ahora,
        crypto.randomUUID(),
      ),
    );
    const res = entregado.cancelar('Intento inválido', usuarioId, ahora, crypto.randomUUID());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('PRODUCTION_DESPACHO_EN_ESTADO_INVALIDO');
  });
});
