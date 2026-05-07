import { describe, it, expect } from 'vitest';
import { DispositivoAutorizado } from '../../aggregates/DispositivoAutorizado.js';
import { DispositivoId, UsuarioId } from '../../value-objects/ids.js';
import { FechaHora } from '../../value-objects/FechaHora.js';
import { NombreDeDispositivoVacioError, DispositivoYaActivoError } from '../../errors/index.js';

// ──────────────────────────────────────────────────────────────
// Constantes compartidas
// ──────────────────────────────────────────────────────────────

const DISPOSITIVO_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ADMIN_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const T0 = FechaHora.deTimestamp(1_700_000_000_000);
const T1 = FechaHora.deTimestamp(1_700_000_060_000); // T0 + 1 min
const T2 = FechaHora.deTimestamp(1_700_000_120_000); // T0 + 2 min
const T3 = FechaHora.deTimestamp(1_700_000_180_000); // T0 + 3 min

// ──────────────────────────────────────────────────────────────
// Helpers de fábrica
// ──────────────────────────────────────────────────────────────

function autorizarDispositivo(
  nombre = 'Tablet Caja 1',
): ReturnType<typeof DispositivoAutorizado.autorizar> {
  return DispositivoAutorizado.autorizar(
    {
      id: DispositivoId.of(DISPOSITIVO_ID),
      nombre,
      autorizadoPor: UsuarioId.of(ADMIN_ID),
      ahora: T0,
    },
    'evt-autorizar-1',
  );
}

function adminId(): UsuarioId {
  return UsuarioId.of(ADMIN_ID);
}

// ──────────────────────────────────────────────────────────────
// 1. autorizar: nombre vacío lanza NombreDeDispositivoVacioError
// ──────────────────────────────────────────────────────────────

describe('DispositivoAutorizado — autorizar', () => {
  it('acepta nombre válido y crea dispositivo activo con una entrada en historial', () => {
    const result = autorizarDispositivo('Tablet Caja 1');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.estado).toBe('activo');
    expect(result.value.historialDeEstados).toHaveLength(1);
  });

  it('normaliza el nombre eliminando espacios en los extremos', () => {
    const result = autorizarDispositivo('  Tablet B  ');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.nombre).toBe('Tablet B');
  });

  it('rechaza nombre vacío con NombreDeDispositivoVacioError', () => {
    const result = autorizarDispositivo('');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(NombreDeDispositivoVacioError);
      expect(result.error.code).toBe('IDENTITY_NOMBRE_DISPOSITIVO_VACIO');
    }
  });

  it('rechaza nombre que solo contiene espacios', () => {
    const result = autorizarDispositivo('   ');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(NombreDeDispositivoVacioError);
    }
  });

  it('emite DispositivoAutorizadoCreado al autorizar', () => {
    const result = autorizarDispositivo('Tablet C');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const eventos = result.value.pullDomainEvents();
    expect(eventos).toHaveLength(1);
    expect(eventos[0]?.tipo).toBe('DispositivoAutorizadoCreado');
  });
});

// ──────────────────────────────────────────────────────────────
// 2. revocar: idempotente si ya está revocado
// ──────────────────────────────────────────────────────────────

describe('DispositivoAutorizado — revocar', () => {
  it('revocar un dispositivo activo lo pasa a estado revocado', () => {
    const resultado = autorizarDispositivo();
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    const revocado = resultado.value.revocar(
      { revocadoPor: adminId(), motivo: 'robo', ahora: T1 },
      'evt-revocar-1',
    );
    expect(revocado.ok).toBe(true);
    if (!revocado.ok) return;
    expect(revocado.value.estado).toBe('revocado');
  });

  it('revocar un dispositivo ya revocado es idempotente: no agrega entrada al historial', () => {
    const resultado = autorizarDispositivo();
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    const revocado1 = resultado.value.revocar(
      { revocadoPor: adminId(), motivo: 'primera revocación', ahora: T1 },
      'evt-revocar-2',
    );
    expect(revocado1.ok).toBe(true);
    if (!revocado1.ok) return;

    const longitudAntes = revocado1.value.historialDeEstados.length;

    const revocado2 = revocado1.value.revocar(
      { revocadoPor: adminId(), motivo: 'segunda revocación', ahora: T2 },
      'evt-revocar-3',
    );
    expect(revocado2.ok).toBe(true);
    if (!revocado2.ok) return;

    // La segunda revocación no debe agregar nueva entrada
    expect(revocado2.value.historialDeEstados.length).toBe(longitudAntes);
    expect(revocado2.value.estado).toBe('revocado');
  });

  it('revocar un dispositivo ya revocado NO agrega evento adicional', () => {
    const resultado = autorizarDispositivo();
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    const revocado1 = resultado.value.revocar(
      { revocadoPor: adminId(), motivo: 'primera', ahora: T1 },
      'evt-revocar-4',
    );
    expect(revocado1.ok).toBe(true);
    if (!revocado1.ok) return;

    const eventosAntes = revocado1.value.pullDomainEvents().length;

    // Intento idempotente: revocar devuelve ok(this) sin nuevo objeto ni eventos
    const revocado2 = revocado1.value.revocar(
      { revocadoPor: adminId(), motivo: 'segunda', ahora: T2 },
      'evt-revocar-5',
    );
    expect(revocado2.ok).toBe(true);
    if (!revocado2.ok) return;

    // La instancia devuelta es la misma (idempotencia), los eventos no crecen
    expect(revocado2.value.pullDomainEvents().length).toBe(eventosAntes);
  });

  it('emite DispositivoRevocado al revocar un dispositivo activo', () => {
    const resultado = autorizarDispositivo();
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    const revocado = resultado.value.revocar(
      { revocadoPor: adminId(), motivo: 'prueba', ahora: T1 },
      'evt-revocar-6',
    );
    expect(revocado.ok).toBe(true);
    if (!revocado.ok) return;

    const tipos = revocado.value.pullDomainEvents().map((e) => e.tipo);
    expect(tipos).toContain('DispositivoRevocado');
  });
});

// ──────────────────────────────────────────────────────────────
// 3. reautorizar
// ──────────────────────────────────────────────────────────────

describe('DispositivoAutorizado — reautorizar', () => {
  it('reautorizar un dispositivo activo devuelve DispositivoYaActivoError', () => {
    const resultado = autorizarDispositivo();
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    const result = resultado.value.reautorizar(
      { reautorizadoPor: adminId(), motivo: 'intento en vano', ahora: T1 },
      'evt-reau-1',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(DispositivoYaActivoError);
      expect(result.error.code).toBe('IDENTITY_DISPOSITIVO_YA_ACTIVO');
    }
  });

  it('reautorizar un dispositivo revocado lo pasa a estado activo', () => {
    const resultado = autorizarDispositivo();
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    const revocado = resultado.value.revocar(
      { revocadoPor: adminId(), motivo: 'pérdida', ahora: T1 },
      'evt-rev-para-reau',
    );
    expect(revocado.ok).toBe(true);
    if (!revocado.ok) return;

    const reautorizado = revocado.value.reautorizar(
      { reautorizadoPor: adminId(), motivo: 'recuperado', ahora: T2 },
      'evt-reau-2',
    );
    expect(reautorizado.ok).toBe(true);
    if (!reautorizado.ok) return;
    expect(reautorizado.value.estado).toBe('activo');
  });

  it('emite DispositivoReautorizado al reautorizar', () => {
    const resultado = autorizarDispositivo();
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    const revocado = resultado.value.revocar(
      { revocadoPor: adminId(), motivo: 'pérdida', ahora: T1 },
      'evt-rev-para-reau-evt',
    );
    expect(revocado.ok).toBe(true);
    if (!revocado.ok) return;

    const reautorizado = revocado.value.reautorizar(
      { reautorizadoPor: adminId(), motivo: 'recuperado', ahora: T2 },
      'evt-reau-3',
    );
    expect(reautorizado.ok).toBe(true);
    if (!reautorizado.ok) return;

    const tipos = reautorizado.value.pullDomainEvents().map((e) => e.tipo);
    expect(tipos).toContain('DispositivoReautorizado');
  });
});

// ──────────────────────────────────────────────────────────────
// renombrar
// ──────────────────────────────────────────────────────────────

describe('DispositivoAutorizado — renombrar', () => {
  it('renombrar con nombre válido actualiza el nombre y emite DispositivoRenombrado', () => {
    const result = autorizarDispositivo('Tablet Original');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const renombrado = result.value.renombrar('Tablet Nueva', T1, 'evt-renombrar');
    expect(renombrado.ok).toBe(true);
    if (!renombrado.ok) return;

    expect(renombrado.value.nombre).toBe('Tablet Nueva');
    const tipos = renombrado.value.pullDomainEvents().map((e) => e.tipo);
    expect(tipos).toContain('DispositivoRenombrado');
  });

  it('renombrar con nombre vacío devuelve NombreDeDispositivoVacioError', () => {
    const result = autorizarDispositivo('Tablet A');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const renombrado = result.value.renombrar('', T1, 'evt-renombrar-vacio');
    expect(renombrado.ok).toBe(false);
    if (!renombrado.ok) {
      expect(renombrado.error).toBeInstanceOf(NombreDeDispositivoVacioError);
    }
  });

  it('renombrar normaliza los espacios del nuevo nombre', () => {
    const result = autorizarDispositivo('Tablet B');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const renombrado = result.value.renombrar('  Tablet C  ', T1, 'evt-renombrar-espacios');
    expect(renombrado.ok).toBe(true);
    if (!renombrado.ok) return;
    expect(renombrado.value.nombre).toBe('Tablet C');
  });

  it('el evento DispositivoRenombrado contiene el nombre anterior y el nuevo', () => {
    const result = autorizarDispositivo('Nombre Viejo');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const renombrado = result.value.renombrar('Nombre Nuevo', T1, 'evt-renombrar-payload');
    expect(renombrado.ok).toBe(true);
    if (!renombrado.ok) return;

    const evento = renombrado.value
      .pullDomainEvents()
      .find((e) => e.tipo === 'DispositivoRenombrado');
    expect(evento).toBeDefined();
    if (evento?.tipo !== 'DispositivoRenombrado') return;
    expect(evento.payload.nombreAnterior).toBe('Nombre Viejo');
    expect(evento.payload.nombreNuevo).toBe('Nombre Nuevo');
  });
});

// ──────────────────────────────────────────────────────────────
// 4. Historial preservado: autorizar -> revocar -> reautorizar tiene 3 entradas
// ──────────────────────────────────────────────────────────────

describe('DispositivoAutorizado — historial de estados', () => {
  it('tras autorizar -> revocar -> reautorizar el historial tiene exactamente 3 entradas', () => {
    const autorizado = autorizarDispositivo();
    expect(autorizado.ok).toBe(true);
    if (!autorizado.ok) return;

    const revocado = autorizado.value.revocar(
      { revocadoPor: adminId(), motivo: 'extraviado', ahora: T1 },
      'evt-hist-rev',
    );
    expect(revocado.ok).toBe(true);
    if (!revocado.ok) return;

    const reautorizado = revocado.value.reautorizar(
      { reautorizadoPor: adminId(), motivo: 'encontrado', ahora: T2 },
      'evt-hist-reau',
    );
    expect(reautorizado.ok).toBe(true);
    if (!reautorizado.ok) return;

    expect(reautorizado.value.historialDeEstados).toHaveLength(3);
    expect(reautorizado.value.historialDeEstados[0]?.estado).toBe('activo');
    expect(reautorizado.value.historialDeEstados[1]?.estado).toBe('revocado');
    expect(reautorizado.value.historialDeEstados[2]?.estado).toBe('activo');
  });

  it('el historial registra el motivo de cada transición', () => {
    const autorizado = autorizarDispositivo();
    expect(autorizado.ok).toBe(true);
    if (!autorizado.ok) return;

    const revocado = autorizado.value.revocar(
      { revocadoPor: adminId(), motivo: 'robo confirmado', ahora: T1 },
      'evt-motivo-rev',
    );
    expect(revocado.ok).toBe(true);
    if (!revocado.ok) return;

    expect(revocado.value.historialDeEstados[1]?.motivo).toBe('robo confirmado');
  });

  it('doble revocar -> reautorizar -> revocar produce historial correcto', () => {
    const autorizado = autorizarDispositivo();
    expect(autorizado.ok).toBe(true);
    if (!autorizado.ok) return;

    const r1 = autorizado.value.revocar(
      { revocadoPor: adminId(), motivo: 'ciclo 1', ahora: T1 },
      'evt-ciclo-r1',
    );
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;

    const ra1 = r1.value.reautorizar(
      { reautorizadoPor: adminId(), motivo: 'ciclo reautorizar 1', ahora: T2 },
      'evt-ciclo-ra1',
    );
    expect(ra1.ok).toBe(true);
    if (!ra1.ok) return;

    const r2 = ra1.value.revocar(
      { revocadoPor: adminId(), motivo: 'ciclo 2', ahora: T3 },
      'evt-ciclo-r2',
    );
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;

    expect(r2.value.historialDeEstados).toHaveLength(4);
    expect(r2.value.estado).toBe('revocado');
  });
});

// ──────────────────────────────────────────────────────────────
// 5. estado es siempre el de la última entrada del historial
// ──────────────────────────────────────────────────────────────

describe('DispositivoAutorizado — estado refleja siempre la última entrada del historial', () => {
  it('estado inicial es activo', () => {
    const result = autorizarDispositivo();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.estado).toBe('activo');
  });

  it('estado después de revocar es revocado', () => {
    const result = autorizarDispositivo();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const revocado = result.value.revocar(
      { revocadoPor: adminId(), motivo: 'estado-test', ahora: T1 },
      'evt-estado-rev',
    );
    expect(revocado.ok).toBe(true);
    if (!revocado.ok) return;
    expect(revocado.value.estado).toBe('revocado');
  });

  it('estado después de reautorizar es activo nuevamente', () => {
    const result = autorizarDispositivo();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const revocado = result.value.revocar(
      { revocadoPor: adminId(), motivo: 'para reautorizar', ahora: T1 },
      'evt-estado-rev2',
    );
    expect(revocado.ok).toBe(true);
    if (!revocado.ok) return;

    const reautorizado = revocado.value.reautorizar(
      { reautorizadoPor: adminId(), motivo: 'vuelto a activo', ahora: T2 },
      'evt-estado-reau2',
    );
    expect(reautorizado.ok).toBe(true);
    if (!reautorizado.ok) return;
    expect(reautorizado.value.estado).toBe('activo');
  });

  it('reconstituir crea dispositivo sin emitir eventos', () => {
    const dispositivo = DispositivoAutorizado.reconstituir({
      id: DispositivoId.of(DISPOSITIVO_ID),
      nombre: 'Tablet Reconstituida',
      historialDeEstados: [
        {
          estado: 'activo',
          cambiadoEn: T0,
          cambiadoPor: adminId(),
          motivo: 'autorización inicial',
        },
      ],
    });
    expect(dispositivo.estado).toBe('activo');
    expect(dispositivo.pullDomainEvents()).toHaveLength(0);
  });

  it('estado siempre corresponde a la última entrada del historialDeEstados', () => {
    const result = autorizarDispositivo();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const revocado = result.value.revocar(
      { revocadoPor: adminId(), motivo: 'verificar último', ahora: T1 },
      'evt-ultimo',
    );
    expect(revocado.ok).toBe(true);
    if (!revocado.ok) return;

    const historial = revocado.value.historialDeEstados;
    const ultimo = historial[historial.length - 1];
    expect(revocado.value.estado).toBe(ultimo?.estado);
  });
});
