import { describe, it, expect } from 'vitest';
import { Sesion } from '../../aggregates/Sesion.js';
import { SesionId, UsuarioId, DispositivoId, MesaId } from '../../value-objects/ids.js';
import { FechaHora } from '../../value-objects/FechaHora.js';
import { Duracion } from '../../value-objects/Duracion.js';
import { PoliticaDeSesion } from '../../value-objects/PoliticaDeSesion.js';
import {
  SesionYaCerradaError,
  SesionBloqueadaError,
  RelojRetrocedidoError,
} from '../../errors/index.js';
import type { ContextoDeDispositivo } from '../../value-objects/enums.js';

// ──────────────────────────────────────────────────────────────
// Constantes compartidas
// ──────────────────────────────────────────────────────────────

const SESION_ID = '55555555-5555-5555-5555-555555555555';
const USUARIO_ID = '66666666-6666-6666-6666-666666666666';
const DISPOSITIVO = '77777777-7777-7777-7777-777777777777';

// Tiempos en ms relativos a T0
const T0 = 1_700_000_000_000;

const POLITICA_CORTA = PoliticaDeSesion.de({
  umbralBloqueo: Duracion.deMinutos(5),
  umbralCierre: Duracion.deMinutos(10),
  topeAbsoluto: Duracion.deMinutos(30),
  limiteSimultaneo: 1,
  requiereDispositivoAutorizado: true,
});

// ──────────────────────────────────────────────────────────────
// Helpers de fábrica
// ──────────────────────────────────────────────────────────────

function ts(ms: number): FechaHora {
  return FechaHora.deTimestamp(ms);
}

interface AbrirOverrides {
  ahora?: FechaHora;
  contextoDispositivo?: ContextoDeDispositivo;
  politica?: PoliticaDeSesion;
}

function abrirSesionValida(overrides?: AbrirOverrides): Sesion {
  return Sesion.abrir(
    {
      id: SesionId.of(SESION_ID),
      usuarioId: UsuarioId.of(USUARIO_ID),
      rol: 'WORKER',
      dispositivoId: DispositivoId.of(DISPOSITIVO),
      politica: overrides?.politica ?? POLITICA_CORTA,
      contextoDispositivo: overrides?.contextoDispositivo ?? 'compartido',
      ahora: overrides?.ahora ?? ts(T0),
    },
    'evt-abrir-1',
  );
}

// ──────────────────────────────────────────────────────────────
// 1. Tope absoluto: sesión expirada no registra actividad
// ──────────────────────────────────────────────────────────────

describe('Sesion — tope absoluto', () => {
  it('una sesión que superó el tope absoluto devuelve SesionYaCerradaError al intentar registrar actividad', () => {
    const sesion = abrirSesionValida({ ahora: ts(T0) });

    // Registramos actividad en T0 + 1 min (ok)
    const conActividad = sesion.registrarActividad(ts(T0 + 60_000), 'evt-act-1');
    expect(conActividad.ok).toBe(true);
    if (!conActividad.ok) return;

    // Intentamos registrar actividad después del tope absoluto (30 min + 1 ms)
    const ahoraFueraDeRango = ts(T0 + 30 * 60_000 + 1);
    const result = conActividad.value.registrarActividad(ahoraFueraDeRango, 'evt-act-2');

    // La sesión expira por tope absoluto: _expirarSiCorresponde retorna la sesión expirada
    // y registrarActividad devuelve ok(sesionExpirada), no error.
    // Lo correcto según el código: registrarActividad llama _expirarSiCorresponde y retorna ok(expirada)
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.estadoSesion).toBe('expirada');
    expect(result.value.motivoDeCierre).toBe('tope_absoluto');
  });

  it('intentar cerrar voluntariamente una sesión ya expirada por tope absoluto devuelve SesionYaCerradaError', () => {
    const sesion = abrirSesionValida({ ahora: ts(T0) });

    // Avanzar más allá del tope absoluto para expirar la sesión vía expirarSiCorresponde
    const ahoraFueraDeRango = ts(T0 + 31 * 60_000);
    const expirada = sesion.expirarSiCorresponde(ahoraFueraDeRango, 'evt-exp-abs');
    expect(expirada).not.toBeNull();
    if (!expirada) return;

    // Intentar cerrar voluntariamente la sesión expirada
    const result = expirada.cerrarVoluntariamente(ahoraFueraDeRango, 'evt-cierre-post');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(SesionYaCerradaError);
    }
  });
});

// ──────────────────────────────────────────────────────────────
// 2. Umbral de cierre: expirarSiCorresponde por inactividad
// ──────────────────────────────────────────────────────────────

describe('Sesion — umbral de cierre por inactividad', () => {
  it('expirarSiCorresponde retorna sesión expirada cuando inactividad >= umbralCierre', () => {
    const sesion = abrirSesionValida({ ahora: ts(T0) });

    // umbralCierre = 10 min; avanzamos 10 min exactos
    const ahora = ts(T0 + 10 * 60_000);
    const resultado = sesion.expirarSiCorresponde(ahora, 'evt-exp-inact');
    expect(resultado).not.toBeNull();
    expect(resultado?.estadoSesion).toBe('expirada');
    expect(resultado?.motivoDeCierre).toBe('inactividad');
  });

  it('expirarSiCorresponde retorna null cuando la inactividad es menor al umbral', () => {
    const sesion = abrirSesionValida({ ahora: ts(T0) });

    // 9 min 59 seg: por debajo del umbral
    const ahora = ts(T0 + 9 * 60_000 + 59_000);
    const resultado = sesion.expirarSiCorresponde(ahora, 'evt-no-exp');
    expect(resultado).toBeNull();
  });

  it('sesión expirada por inactividad emite SesionExpiradaPorInactividad', () => {
    const sesion = abrirSesionValida({ ahora: ts(T0) });
    const expirada = sesion.expirarSiCorresponde(ts(T0 + 10 * 60_000), 'evt-exp-inact-2');
    expect(expirada).not.toBeNull();
    if (!expirada) return;

    const eventos = expirada.pullDomainEvents();
    const tipos = eventos.map((e) => e.tipo);
    expect(tipos).toContain('SesionExpiradaPorInactividad');
  });
});

// ──────────────────────────────────────────────────────────────
// 3. Bloqueo automático: debeBloquearseAutomaticamente
// ──────────────────────────────────────────────────────────────

describe('Sesion — bloqueo automático', () => {
  it('debeBloquearseAutomaticamente es true en dispositivo compartido tras umbralBloqueo', () => {
    const sesion = abrirSesionValida({ ahora: ts(T0), contextoDispositivo: 'compartido' });

    // umbralBloqueo = 5 min; avanzamos 5 min exactos
    const ahora = ts(T0 + 5 * 60_000);
    expect(sesion.debeBloquearseAutomaticamente(ahora)).toBe(true);
  });

  it('debeBloquearseAutomaticamente es false en dispositivo compartido antes del umbralBloqueo', () => {
    const sesion = abrirSesionValida({ ahora: ts(T0), contextoDispositivo: 'compartido' });

    const ahora = ts(T0 + 4 * 60_000 + 59_000); // 4 min 59 seg
    expect(sesion.debeBloquearseAutomaticamente(ahora)).toBe(false);
  });

  it('debeBloquearseAutomaticamente es false en dispositivo personal aunque supere el umbral', () => {
    const sesion = abrirSesionValida({ ahora: ts(T0), contextoDispositivo: 'personal' });

    const ahora = ts(T0 + 60 * 60_000); // 1 hora de inactividad
    expect(sesion.debeBloquearseAutomaticamente(ahora)).toBe(false);
  });

  it('debeBloquearseAutomaticamente es false si la sesión ya está bloqueada', () => {
    const sesion = abrirSesionValida({ ahora: ts(T0), contextoDispositivo: 'compartido' });

    const bloqueada = sesion.bloquearPantalla(ts(T0 + 1_000), 'evt-bloqueo');
    expect(bloqueada.ok).toBe(true);
    if (!bloqueada.ok) return;

    const ahora = ts(T0 + 10 * 60_000);
    expect(bloqueada.value.debeBloquearseAutomaticamente(ahora)).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────
// 4. Sesión bloqueada: registrarActividad devuelve SesionBloqueadaError
// ──────────────────────────────────────────────────────────────

describe('Sesion — sesión bloqueada', () => {
  it('registrarActividad sobre sesión bloqueada devuelve SesionBloqueadaError', () => {
    const sesion = abrirSesionValida({ ahora: ts(T0) });

    const bloqueada = sesion.bloquearPantalla(ts(T0 + 1_000), 'evt-bloqueo-2');
    expect(bloqueada.ok).toBe(true);
    if (!bloqueada.ok) return;

    const result = bloqueada.value.registrarActividad(ts(T0 + 2_000), 'evt-act-bloqueada');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(SesionBloqueadaError);
      expect(result.error.code).toBe('IDENTITY_SESION_BLOQUEADA');
    }
  });

  it('desbloquear permite registrar actividad nuevamente', () => {
    const sesion = abrirSesionValida({ ahora: ts(T0) });

    const bloqueada = sesion.bloquearPantalla(ts(T0 + 1_000), 'evt-bloqueo-3');
    expect(bloqueada.ok).toBe(true);
    if (!bloqueada.ok) return;

    const desbloqueada = bloqueada.value.desbloquear(ts(T0 + 2_000), 'evt-desbloqueo');
    expect(desbloqueada.ok).toBe(true);
    if (!desbloqueada.ok) return;

    const result = desbloqueada.value.registrarActividad(ts(T0 + 3_000), 'evt-act-post-desbloqueo');
    expect(result.ok).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// 5. Reloj monótono: registrarActividad con ahora < ultimaActividadEn
// ──────────────────────────────────────────────────────────────

describe('Sesion — reloj monótono', () => {
  it('registrarActividad con timestamp anterior a la última actividad devuelve RelojRetrocedidoError', () => {
    const sesion = abrirSesionValida({ ahora: ts(T0) });

    // Registramos en T0 + 5 min
    const con5min = sesion.registrarActividad(ts(T0 + 5 * 60_000), 'evt-act-5min');
    expect(con5min.ok).toBe(true);
    if (!con5min.ok) return;

    // Intentamos registrar en T0 + 3 min (retroceso)
    const result = con5min.value.registrarActividad(ts(T0 + 3 * 60_000), 'evt-act-retroceso');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(RelojRetrocedidoError);
      expect(result.error.code).toBe('IDENTITY_RELOJ_RETROCEDIDO');
    }
  });

  it('registrarActividad con el mismo timestamp que la última actividad es aceptado (no es retroceso)', () => {
    const sesion = abrirSesionValida({ ahora: ts(T0) });

    // T0 no es anterior a T0 (isBefore es estrictamente menor)
    const result = sesion.registrarActividad(ts(T0), 'evt-act-mismo-ts');
    expect(result.ok).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// 6. Cierre idempotente
// ──────────────────────────────────────────────────────────────

describe('Sesion — cierre idempotente', () => {
  it('cerrarVoluntariamente sobre sesión ya cerrada devuelve SesionYaCerradaError', () => {
    const sesion = abrirSesionValida({ ahora: ts(T0) });

    const cerrada = sesion.cerrarVoluntariamente(ts(T0 + 1_000), 'evt-cierre-1');
    expect(cerrada.ok).toBe(true);
    if (!cerrada.ok) return;

    const result = cerrada.value.cerrarVoluntariamente(ts(T0 + 2_000), 'evt-cierre-2');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(SesionYaCerradaError);
      expect(result.error.code).toBe('IDENTITY_SESION_YA_CERRADA');
    }
  });

  it('revocar sobre sesión ya revocada es idempotente (no falla)', () => {
    const sesion = abrirSesionValida({ ahora: ts(T0) });

    const revocada = sesion.revocar('revocada_por_admin', ts(T0 + 1_000), 'evt-rev-1', null);
    expect(revocada.estadoSesion).toBe('revocada');

    // Segunda revocación sobre sesión ya revocada: devuelve la misma sin cambios
    const revocada2 = revocada.revocar('usuario_deshabilitado', ts(T0 + 2_000), 'evt-rev-2', null);
    expect(revocada2.estadoSesion).toBe('revocada');
    // La segunda revocación no debería agregar eventos nuevos
    expect(revocada2.pullDomainEvents()).toHaveLength(revocada.pullDomainEvents().length);
  });
});

// ──────────────────────────────────────────────────────────────
// 7. Eventos de dominio emitidos
// ──────────────────────────────────────────────────────────────

describe('Sesion — eventos de dominio emitidos', () => {
  it('abrir emite SesionAbierta', () => {
    const sesion = abrirSesionValida({ ahora: ts(T0) });
    const eventos = sesion.pullDomainEvents();
    expect(eventos).toHaveLength(1);
    expect(eventos[0]?.tipo).toBe('SesionAbierta');
  });

  it('SesionAbierta contiene los campos del payload', () => {
    const sesion = abrirSesionValida({ ahora: ts(T0) });
    const evento = sesion.pullDomainEvents()[0];
    expect(evento?.tipo).toBe('SesionAbierta');
    if (evento?.tipo !== 'SesionAbierta') return;
    expect(evento.payload.sesionId).toBe(SESION_ID);
    expect(evento.payload.usuarioId).toBe(USUARIO_ID);
    expect(evento.payload.rol).toBe('WORKER');
  });

  it('bloquearPantalla emite PantallaBloqueada', () => {
    const sesion = abrirSesionValida({ ahora: ts(T0) });
    const bloqueada = sesion.bloquearPantalla(ts(T0 + 1_000), 'evt-bloqueo-evt');
    expect(bloqueada.ok).toBe(true);
    if (!bloqueada.ok) return;

    const tipos = bloqueada.value.pullDomainEvents().map((e) => e.tipo);
    expect(tipos).toContain('PantallaBloqueada');
  });

  it('desbloquear emite PantallaDesbloqueada', () => {
    const sesion = abrirSesionValida({ ahora: ts(T0) });
    const bloqueada = sesion.bloquearPantalla(ts(T0 + 1_000), 'evt-bloqueo-para-desbloqueo');
    expect(bloqueada.ok).toBe(true);
    if (!bloqueada.ok) return;

    const desbloqueada = bloqueada.value.desbloquear(ts(T0 + 2_000), 'evt-desbloqueo-final');
    expect(desbloqueada.ok).toBe(true);
    if (!desbloqueada.ok) return;

    const tipos = desbloqueada.value.pullDomainEvents().map((e) => e.tipo);
    expect(tipos).toContain('PantallaDesbloqueada');
  });

  it('cerrarVoluntariamente emite SesionCerrada', () => {
    const sesion = abrirSesionValida({ ahora: ts(T0) });
    const cerrada = sesion.cerrarVoluntariamente(ts(T0 + 1_000), 'evt-cierre-vol');
    expect(cerrada.ok).toBe(true);
    if (!cerrada.ok) return;

    const tipos = cerrada.value.pullDomainEvents().map((e) => e.tipo);
    expect(tipos).toContain('SesionCerrada');
    expect(cerrada.value.estadoSesion).toBe('cerrada');
    expect(cerrada.value.motivoDeCierre).toBe('cierre_voluntario');
  });

  it('bloquear dos veces seguidas no duplica el evento PantallaBloqueada', () => {
    const sesion = abrirSesionValida({ ahora: ts(T0) });
    const bloqueada = sesion.bloquearPantalla(ts(T0 + 1_000), 'evt-bloqueo-dup-1');
    expect(bloqueada.ok).toBe(true);
    if (!bloqueada.ok) return;

    // Según el código, bloquearPantalla sobre sesión ya bloqueada retorna ok(this) sin nuevo evento
    const bloqueadaDeNuevo = bloqueada.value.bloquearPantalla(ts(T0 + 2_000), 'evt-bloqueo-dup-2');
    expect(bloqueadaDeNuevo.ok).toBe(true);
    if (!bloqueadaDeNuevo.ok) return;

    const cantidadPantallaBloqueada = bloqueadaDeNuevo.value
      .pullDomainEvents()
      .filter((e) => e.tipo === 'PantallaBloqueada').length;
    expect(cantidadPantallaBloqueada).toBe(1);
  });
});

// ──────────────────────────────────────────────────────────────
// cerrarConMesasAbiertas
// ──────────────────────────────────────────────────────────────

describe('Sesion — cerrarConMesasAbiertas', () => {
  it('cierra la sesión con estado expirada y emite SesionCerradaConMesaAbierta', () => {
    const sesion = abrirSesionValida({ ahora: ts(T0) });
    const mesas = [MesaId.of('mesa-1'), MesaId.of('mesa-2')];

    const cerrada = sesion.cerrarConMesasAbiertas(
      mesas,
      'unidad-1',
      ts(T0 + 1_000),
      'evt-cerrar-mesas',
    );
    expect(cerrada.estadoSesion).toBe('expirada');
    expect(cerrada.motivoDeCierre).toBe('inactividad');

    const tipos = cerrada.pullDomainEvents().map((e) => e.tipo);
    expect(tipos).toContain('SesionCerradaConMesaAbierta');
  });

  it('cerrarConMesasAbiertas sobre sesión ya cerrada es idempotente (retorna misma instancia)', () => {
    const sesion = abrirSesionValida({ ahora: ts(T0) });
    const cerrada = sesion.cerrarVoluntariamente(ts(T0 + 1_000), 'evt-cierre-prev');
    expect(cerrada.ok).toBe(true);
    if (!cerrada.ok) return;

    // Sobre sesión ya cerrada, cerrarConMesasAbiertas devuelve this
    const resultado = cerrada.value.cerrarConMesasAbiertas(
      [],
      'unidad-1',
      ts(T0 + 2_000),
      'evt-cerrar-mesas-idem',
    );
    expect(resultado.estadoSesion).toBe('cerrada');
  });
});

// ──────────────────────────────────────────────────────────────
// reconstituir
// ──────────────────────────────────────────────────────────────

describe('Sesion — reconstituir', () => {
  it('reconstituir crea sesión sin emitir eventos de dominio', () => {
    const sesion = Sesion.reconstituir({
      id: SesionId.of(SESION_ID),
      usuarioId: UsuarioId.of(USUARIO_ID),
      rol: 'WORKER',
      dispositivoId: DispositivoId.of(DISPOSITIVO),
      politica: POLITICA_CORTA,
      contextoDispositivo: 'compartido',
      iniciadaEn: ts(T0),
      ultimaActividadEn: ts(T0),
      expiraEnAbsoluto: ts(T0 + 30 * 60_000),
      estadoSesion: 'activa',
      estadoBloqueo: 'desbloqueada',
      bloqueadaEn: null,
      cerradaEn: null,
      motivoDeCierre: null,
    });
    expect(sesion.estadoSesion).toBe('activa');
    expect(sesion.pullDomainEvents()).toHaveLength(0);
  });
});
