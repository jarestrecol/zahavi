import { describe, it, expect } from 'vitest';
import { FechaHora } from '../../value-objects/FechaHora.js';
import { NombreCompleto } from '../../value-objects/NombreCompleto.js';
import {
  UsuarioId,
  SesionId,
  DispositivoId,
  MesaId,
  UnidadDeNegocioId,
} from '../../value-objects/ids.js';
import {
  NombreCompletoInvalidoError,
  SesionExpiradaError,
  LimiteDeSesionesAlcanzadoError,
  DispositivoNoAutorizadoError,
  DispositivoNoActivoError,
  TotpNoVerificadoError,
  DispositivoRequeridoParaWorkerError,
} from '../../errors/index.js';

// ──────────────────────────────────────────────────────────────
// FechaHora
// ──────────────────────────────────────────────────────────────

describe('FechaHora', () => {
  it('deTimestamp crea instancia con el timestamp dado', () => {
    const f = FechaHora.deTimestamp(1_000_000);
    expect(f.toTimestamp()).toBe(1_000_000);
  });

  it('deTimestamp lanza con valor no finito', () => {
    expect(() => FechaHora.deTimestamp(NaN)).toThrow();
    expect(() => FechaHora.deTimestamp(Infinity)).toThrow();
  });

  it('ahora() crea instancia con un timestamp actual', () => {
    const antes = Date.now();
    const f = FechaHora.ahora();
    const despues = Date.now();
    expect(f.toTimestamp()).toBeGreaterThanOrEqual(antes);
    expect(f.toTimestamp()).toBeLessThanOrEqual(despues);
  });

  it('isAfter devuelve true cuando es posterior', () => {
    const a = FechaHora.deTimestamp(2_000);
    const b = FechaHora.deTimestamp(1_000);
    expect(a.isAfter(b)).toBe(true);
  });

  it('isAfter devuelve false cuando es anterior', () => {
    const a = FechaHora.deTimestamp(1_000);
    const b = FechaHora.deTimestamp(2_000);
    expect(a.isAfter(b)).toBe(false);
  });

  it('equals devuelve true para timestamps iguales', () => {
    const a = FechaHora.deTimestamp(5_000);
    const b = FechaHora.deTimestamp(5_000);
    expect(a.equals(b)).toBe(true);
  });

  it('toISOString devuelve una cadena ISO válida', () => {
    const f = FechaHora.deTimestamp(0);
    expect(f.toISOString()).toBe('1970-01-01T00:00:00.000Z');
  });

  it('masMillisegundos suma correctamente', () => {
    const f = FechaHora.deTimestamp(1_000);
    expect(f.masMillisegundos(500).toTimestamp()).toBe(1_500);
  });

  it('diferenciaEnMs calcula la diferencia', () => {
    const a = FechaHora.deTimestamp(3_000);
    const b = FechaHora.deTimestamp(1_000);
    expect(a.diferenciaEnMs(b)).toBe(2_000);
  });
});

// ──────────────────────────────────────────────────────────────
// NombreCompleto
// ──────────────────────────────────────────────────────────────

describe('NombreCompleto', () => {
  it('acepta nombre de 2 o más caracteres', () => {
    const result = NombreCompleto.of('Ju');
    expect(result.ok).toBe(true);
  });

  it('normaliza múltiples espacios internos a uno solo', () => {
    const result = NombreCompleto.of('Juan   Pérez');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.toString()).toBe('Juan Pérez');
    }
  });

  it('rechaza nombre vacío', () => {
    const result = NombreCompleto.of('');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(NombreCompletoInvalidoError);
      expect(result.error.code).toBe('IDENTITY_NOMBRE_INVALIDO');
    }
  });

  it('rechaza nombre de un solo carácter', () => {
    const result = NombreCompleto.of('A');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(NombreCompletoInvalidoError);
    }
  });

  it('rechaza nombre con carácter de control', () => {
    const result = NombreCompleto.of('Juan\x00Pérez');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(NombreCompletoInvalidoError);
    }
  });

  it('rechaza nombre de más de 120 caracteres', () => {
    const largo = 'A'.repeat(121);
    const result = NombreCompleto.of(largo);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(NombreCompletoInvalidoError);
    }
  });

  it('equals devuelve true para nombres idénticos', () => {
    const a = NombreCompleto.of('Juan Pérez');
    const b = NombreCompleto.of('Juan Pérez');
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.value.equals(b.value)).toBe(true);
    }
  });
});

// ──────────────────────────────────────────────────────────────
// IDs
// ──────────────────────────────────────────────────────────────

describe('IDs de dominio', () => {
  const UUID_VALIDO = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  it('UsuarioId.of acepta UUID válido', () => {
    const id = UsuarioId.of(UUID_VALIDO);
    expect(id.toString()).toBe(UUID_VALIDO);
  });

  it('UsuarioId.of lanza con UUID inválido', () => {
    expect(() => UsuarioId.of('no-es-uuid')).toThrow();
  });

  it('UsuarioId.equals devuelve true para el mismo valor', () => {
    const a = UsuarioId.of(UUID_VALIDO);
    const b = UsuarioId.of(UUID_VALIDO);
    expect(a.equals(b)).toBe(true);
  });

  it('SesionId.of acepta UUID válido', () => {
    const id = SesionId.of(UUID_VALIDO);
    expect(id.toString()).toBe(UUID_VALIDO);
  });

  it('SesionId.of lanza con UUID inválido', () => {
    expect(() => SesionId.of('invalido')).toThrow();
  });

  it('DispositivoId.of acepta UUID válido', () => {
    const id = DispositivoId.of(UUID_VALIDO);
    expect(id.toString()).toBe(UUID_VALIDO);
  });

  it('DispositivoId.of lanza con UUID inválido', () => {
    expect(() => DispositivoId.of('invalido')).toThrow();
  });

  it('MesaId.of acepta cadena no vacía', () => {
    const id = MesaId.of('mesa-5');
    expect(id.toString()).toBe('mesa-5');
  });

  it('MesaId.of lanza con cadena vacía', () => {
    expect(() => MesaId.of('')).toThrow();
    expect(() => MesaId.of('   ')).toThrow();
  });

  it('MesaId.equals devuelve true para el mismo valor', () => {
    const a = MesaId.of('mesa-1');
    const b = MesaId.of('mesa-1');
    expect(a.equals(b)).toBe(true);
  });

  it('UnidadDeNegocioId.of acepta UUID válido', () => {
    const id = UnidadDeNegocioId.of(UUID_VALIDO);
    expect(id.toString()).toBe(UUID_VALIDO);
  });

  it('UnidadDeNegocioId.of lanza con UUID inválido', () => {
    expect(() => UnidadDeNegocioId.of('no-uuid')).toThrow();
  });
});

// ──────────────────────────────────────────────────────────────
// Clases de error de dominio (cobertura de constructores)
// ──────────────────────────────────────────────────────────────

describe('Errores de dominio — constructores y códigos', () => {
  it('SesionExpiradaError tiene código IDENTITY_SESION_EXPIRADA', () => {
    const error = new SesionExpiradaError('sesion-1');
    expect(error.code).toBe('IDENTITY_SESION_EXPIRADA');
    expect(error.message).toContain('sesion-1');
  });

  it('LimiteDeSesionesAlcanzadoError tiene código IDENTITY_LIMITE_SESIONES', () => {
    const error = new LimiteDeSesionesAlcanzadoError(3);
    expect(error.code).toBe('IDENTITY_LIMITE_SESIONES');
    expect(error.message).toContain('3');
  });

  it('DispositivoNoAutorizadoError tiene código IDENTITY_DISPOSITIVO_NO_AUTORIZADO', () => {
    const error = new DispositivoNoAutorizadoError('dev-1');
    expect(error.code).toBe('IDENTITY_DISPOSITIVO_NO_AUTORIZADO');
  });

  it('DispositivoNoActivoError tiene código IDENTITY_DISPOSITIVO_NO_ACTIVO', () => {
    const error = new DispositivoNoActivoError('dev-2');
    expect(error.code).toBe('IDENTITY_DISPOSITIVO_NO_ACTIVO');
  });

  it('TotpNoVerificadoError tiene código IDENTITY_TOTP_NO_VERIFICADO', () => {
    const error = new TotpNoVerificadoError();
    expect(error.code).toBe('IDENTITY_TOTP_NO_VERIFICADO');
  });

  it('DispositivoRequeridoParaWorkerError tiene código IDENTITY_DISPOSITIVO_REQUERIDO', () => {
    const error = new DispositivoRequeridoParaWorkerError();
    expect(error.code).toBe('IDENTITY_DISPOSITIVO_REQUERIDO');
  });
});
