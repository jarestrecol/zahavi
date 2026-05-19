import { describe, it, expect } from 'vitest';
import { Usuario, type Credencial } from '../../aggregates/Usuario.js';
import { UsuarioId } from '../../value-objects/ids.js';
import { Email } from '../../value-objects/Email.js';
import { NombreCompleto } from '../../value-objects/NombreCompleto.js';
import { HashDeContrasena, HashDePin, SecretoTotp } from '../../value-objects/credenciales.js';
import { FechaHora } from '../../value-objects/FechaHora.js';
import type { Rol } from '../../value-objects/enums.js';
import {
  CredencialIncoherenteConRolError,
  RolNoAutorizadoParaCrearError,
  UltimoSuperadminProtegidoError,
  AccionSobreSiMismoNoPermitidaError,
  UsuarioNoActivoError,
} from '../../errors/index.js';

// ──────────────────────────────────────────────────────────────
// Helpers de fábrica
// ──────────────────────────────────────────────────────────────

const ID_SUPERADMIN = '11111111-1111-1111-1111-111111111111';
const ID_ADMIN = '22222222-2222-2222-2222-222222222222';
const ID_WORKER = '33333333-3333-3333-3333-333333333333';
const ID_ACTOR = '44444444-4444-4444-4444-444444444444';

const AHORA = FechaHora.deTimestamp(1_700_000_000_000);

function credencialNavegador(): Credencial {
  return {
    tipo: 'navegador',
    hashDeContrasena: HashDeContrasena.deCadenaYaHasheada('$argon2id$v=19$hash'),
    secretoTotp: null,
    totpVerificado: false,
  };
}

function credencialNavegadorConTotpVerificado(): Credencial {
  return {
    tipo: 'navegador',
    hashDeContrasena: HashDeContrasena.deCadenaYaHasheada('$argon2id$v=19$hash'),
    secretoTotp: SecretoTotp.de('JBSWY3DPEHPK3PXP'),
    totpVerificado: true,
  };
}

function credencialTablet(): Credencial {
  return {
    tipo: 'tablet',
    hashDePin: HashDePin.deCadenaYaHasheada('$argon2id$v=19$hashpin'),
  };
}

function emailValido(local: string): Email {
  const result = Email.of(`${local}@zahavi.co`);
  if (!result.ok) throw new Error('Email de test inválido');
  return result.value;
}

function nombreValido(nombre: string): NombreCompleto {
  const result = NombreCompleto.of(nombre);
  if (!result.ok) throw new Error('Nombre de test inválido');
  return result.value;
}

/**
 * Crea un Usuario listo para usar en tests. Por defecto crea un SUPERADMIN
 * con credencial de navegador (TOTP no verificado). Acepta overrides parciales.
 */
function crearUsuario(overrides?: {
  id?: string;
  rol?: Rol;
  credencial?: Credencial;
  actorRol?: Rol | null;
  creadoPor?: string | null;
}): ReturnType<typeof Usuario.crear> {
  const rol: Rol = overrides?.rol ?? 'SUPERADMIN';
  const credencial =
    overrides?.credencial ?? (rol === 'WORKER' ? credencialTablet() : credencialNavegador());

  return Usuario.crear(
    {
      id: UsuarioId.of(overrides?.id ?? ID_SUPERADMIN),
      email: emailValido('usuario'),
      nombre: nombreValido('Juan Pérez'),
      rol,
      credencial,
      ahora: AHORA,
      creadoPor:
        overrides?.creadoPor !== undefined
          ? overrides.creadoPor !== null
            ? UsuarioId.of(overrides.creadoPor)
            : null
          : null,
      actorRol: overrides?.actorRol !== undefined ? overrides.actorRol : null,
    },
    'evento-id-1',
  );
}

// ──────────────────────────────────────────────────────────────
// Invariante 1: Credencial coherente con rol
// ──────────────────────────────────────────────────────────────

describe('Usuario — invariante: credencial coherente con rol', () => {
  it('WORKER con credencial tablet es válido', () => {
    const result = crearUsuario({ rol: 'WORKER', credencial: credencialTablet() });
    expect(result.ok).toBe(true);
  });

  it('ADMIN con credencial navegador es válido', () => {
    const result = crearUsuario({
      rol: 'ADMIN',
      credencial: credencialNavegador(),
      actorRol: 'SUPERADMIN',
    });
    expect(result.ok).toBe(true);
  });

  it('SUPERADMIN con credencial navegador es válido', () => {
    const result = crearUsuario({
      rol: 'SUPERADMIN',
      credencial: credencialNavegador(),
      actorRol: null,
    });
    expect(result.ok).toBe(true);
  });

  it('WORKER con credencial navegador es rechazado', () => {
    const result = crearUsuario({ rol: 'WORKER', credencial: credencialNavegador() });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(CredencialIncoherenteConRolError);
      expect(result.error.code).toBe('IDENTITY_CREDENCIAL_INCOHERENTE');
    }
  });

  it('ADMIN con credencial tablet es rechazado', () => {
    const result = crearUsuario({
      rol: 'ADMIN',
      credencial: credencialTablet(),
      actorRol: 'SUPERADMIN',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(CredencialIncoherenteConRolError);
    }
  });

  it('SUPERADMIN con credencial tablet es rechazado', () => {
    const result = crearUsuario({
      rol: 'SUPERADMIN',
      credencial: credencialTablet(),
      actorRol: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(CredencialIncoherenteConRolError);
    }
  });
});

// ──────────────────────────────────────────────────────────────
// Invariante 2: Solo SUPERADMIN puede crear SUPERADMIN
// ──────────────────────────────────────────────────────────────

describe('Usuario — invariante: solo SUPERADMIN puede crear SUPERADMIN', () => {
  it('SUPERADMIN puede crear otro SUPERADMIN', () => {
    const result = crearUsuario({ rol: 'SUPERADMIN', actorRol: 'SUPERADMIN' });
    expect(result.ok).toBe(true);
  });

  it('ADMIN no puede crear SUPERADMIN', () => {
    const result = crearUsuario({ rol: 'SUPERADMIN', actorRol: 'ADMIN' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(RolNoAutorizadoParaCrearError);
      expect(result.error.code).toBe('IDENTITY_ROL_NO_AUTORIZADO_CREAR');
    }
  });

  it('WORKER no puede crear SUPERADMIN', () => {
    const result = crearUsuario({ rol: 'SUPERADMIN', actorRol: 'WORKER' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(RolNoAutorizadoParaCrearError);
    }
  });

  it('ADMIN puede crear WORKER (sin restricción adicional)', () => {
    const result = crearUsuario({
      rol: 'WORKER',
      credencial: credencialTablet(),
      actorRol: 'ADMIN',
    });
    expect(result.ok).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// Invariante 3: No se puede deshabilitar al último SUPERADMIN
// ──────────────────────────────────────────────────────────────

describe('Usuario — invariante: último SUPERADMIN protegido', () => {
  it('no se puede deshabilitar al último SUPERADMIN', () => {
    const creado = crearUsuario({ id: ID_SUPERADMIN, rol: 'SUPERADMIN', actorRol: null });
    expect(creado.ok).toBe(true);
    if (!creado.ok) return;

    const result = creado.value.deshabilitar(
      UsuarioId.of(ID_ACTOR),
      'prueba de protección',
      AHORA,
      'evento-id-2',
      true, // estaEsElUltimoSuperadmin
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(UltimoSuperadminProtegidoError);
      expect(result.error.code).toBe('IDENTITY_ULTIMO_SUPERADMIN_PROTEGIDO');
    }
  });

  it('se puede deshabilitar un SUPERADMIN cuando hay más de uno', () => {
    const creado = crearUsuario({ id: ID_SUPERADMIN, rol: 'SUPERADMIN', actorRol: null });
    expect(creado.ok).toBe(true);
    if (!creado.ok) return;

    const result = creado.value.deshabilitar(
      UsuarioId.of(ID_ACTOR),
      'no es el único',
      AHORA,
      'evento-id-3',
      false, // NO es el último
    );
    expect(result.ok).toBe(true);
  });

  it('cambiarRol no puede degradar al último SUPERADMIN', () => {
    const creado = crearUsuario({ id: ID_SUPERADMIN, rol: 'SUPERADMIN', actorRol: null });
    expect(creado.ok).toBe(true);
    if (!creado.ok) return;

    const result = creado.value.cambiarRol(
      'ADMIN',
      credencialNavegador(),
      UsuarioId.of(ID_ACTOR),
      'SUPERADMIN',
      AHORA,
      'evento-id-4',
      true, // estaEsElUltimoSuperadmin
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(UltimoSuperadminProtegidoError);
    }
  });
});

// ──────────────────────────────────────────────────────────────
// Invariante 4: Un usuario no puede deshabilitarse a sí mismo
// ──────────────────────────────────────────────────────────────

describe('Usuario — invariante: acción sobre sí mismo no permitida', () => {
  it('no se puede deshabilitar a uno mismo', () => {
    const creado = crearUsuario({ id: ID_SUPERADMIN, rol: 'SUPERADMIN', actorRol: null });
    expect(creado.ok).toBe(true);
    if (!creado.ok) return;

    // El actor ES el mismo usuario
    const result = creado.value.deshabilitar(
      UsuarioId.of(ID_SUPERADMIN),
      'auto-deshabilitación',
      AHORA,
      'evento-id-5',
      false,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(AccionSobreSiMismoNoPermitidaError);
      expect(result.error.code).toBe('IDENTITY_ACCION_SOBRE_SI_MISMO');
    }
  });

  it('un actor distinto puede deshabilitar al usuario sin problema', () => {
    const creado = crearUsuario({ id: ID_ADMIN, rol: 'ADMIN', actorRol: 'SUPERADMIN' });
    expect(creado.ok).toBe(true);
    if (!creado.ok) return;

    const result = creado.value.deshabilitar(
      UsuarioId.of(ID_ACTOR), // actor distinto
      'motivo válido',
      AHORA,
      'evento-id-6',
      false,
    );
    expect(result.ok).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// Invariante 5: estaOperativo() — reglas de TOTP por rol
// ADMIN sin TOTP enrolado → operativo (TOTP opcional para no-SUPERADMIN)
// ADMIN con TOTP enrolado pero sin confirmar → NO operativo (enrolamiento incompleto)
// SUPERADMIN sin TOTP enrolado → NO operativo (2FA obligatorio)
// ──────────────────────────────────────────────────────────────

describe('Usuario — estaOperativo()', () => {
  it('ADMIN activo sin TOTP enrolado SÍ está operativo (TOTP opcional para ADMIN)', () => {
    const result = crearUsuario({
      id: ID_ADMIN,
      rol: 'ADMIN',
      credencial: credencialNavegador(), // secretoTotp: null, totpVerificado: false
      actorRol: 'SUPERADMIN',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.estaOperativo()).toBe(true);
  });

  it('ADMIN activo con TOTP enrolado pero NO confirmado NO está operativo', () => {
    const credConTotpSinConfirmar: import('../../aggregates/Usuario.js').Credencial = {
      tipo: 'navegador',
      hashDeContrasena: HashDeContrasena.deCadenaYaHasheada('$argon2id$v=19$hash'),
      secretoTotp: SecretoTotp.de('JBSWY3DPEHPK3PXP'),
      totpVerificado: false, // enrolado pero no confirmado
    };
    const result = crearUsuario({
      id: ID_ADMIN,
      rol: 'ADMIN',
      credencial: credConTotpSinConfirmar,
      actorRol: 'SUPERADMIN',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.estaOperativo()).toBe(false);
  });

  it('SUPERADMIN activo sin TOTP enrolado NO está operativo', () => {
    const result = crearUsuario({
      rol: 'SUPERADMIN',
      credencial: credencialNavegador(),
      actorRol: null,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.estaOperativo()).toBe(false);
  });

  it('ADMIN activo con TOTP verificado SÍ está operativo', () => {
    const result = crearUsuario({
      id: ID_ADMIN,
      rol: 'ADMIN',
      credencial: credencialNavegadorConTotpVerificado(),
      actorRol: 'SUPERADMIN',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.estaOperativo()).toBe(true);
  });

  it('WORKER activo con credencial tablet SÍ está operativo (no requiere TOTP)', () => {
    const result = crearUsuario({
      id: ID_WORKER,
      rol: 'WORKER',
      credencial: credencialTablet(),
      actorRol: 'ADMIN',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.estaOperativo()).toBe(true);
  });

  it('usuario deshabilitado NO está operativo aunque tenga TOTP verificado', () => {
    const creado = crearUsuario({
      id: ID_ADMIN,
      rol: 'ADMIN',
      credencial: credencialNavegadorConTotpVerificado(),
      actorRol: 'SUPERADMIN',
    });
    expect(creado.ok).toBe(true);
    if (!creado.ok) return;

    const deshabilitado = creado.value.deshabilitar(
      UsuarioId.of(ID_ACTOR),
      'baja definitiva',
      AHORA,
      'evento-id-7',
      false,
    );
    expect(deshabilitado.ok).toBe(true);
    if (!deshabilitado.ok) return;
    expect(deshabilitado.value.estaOperativo()).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────
// Invariante 6: cambiarRol requiere credencial del tipo correcto para el nuevo rol
// ──────────────────────────────────────────────────────────────

describe('Usuario — cambiarRol: credencial debe ser coherente con el nuevo rol', () => {
  it('cambiar ADMIN a WORKER requiere credencial tablet', () => {
    const admin = crearUsuario({
      id: ID_ADMIN,
      rol: 'ADMIN',
      credencial: credencialNavegador(),
      actorRol: 'SUPERADMIN',
    });
    expect(admin.ok).toBe(true);
    if (!admin.ok) return;

    const result = admin.value.cambiarRol(
      'WORKER',
      credencialTablet(), // correcto para WORKER
      UsuarioId.of(ID_ACTOR),
      'SUPERADMIN',
      AHORA,
      'evento-id-8',
      false,
    );
    expect(result.ok).toBe(true);
  });

  it('cambiar ADMIN a WORKER con credencial navegador es rechazado', () => {
    const admin = crearUsuario({
      id: ID_ADMIN,
      rol: 'ADMIN',
      credencial: credencialNavegador(),
      actorRol: 'SUPERADMIN',
    });
    expect(admin.ok).toBe(true);
    if (!admin.ok) return;

    const result = admin.value.cambiarRol(
      'WORKER',
      credencialNavegador(), // incorrecto para WORKER
      UsuarioId.of(ID_ACTOR),
      'SUPERADMIN',
      AHORA,
      'evento-id-9',
      false,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(CredencialIncoherenteConRolError);
    }
  });

  it('cambiar WORKER a SUPERADMIN requiere credencial navegador y actor SUPERADMIN', () => {
    const worker = crearUsuario({
      id: ID_WORKER,
      rol: 'WORKER',
      credencial: credencialTablet(),
      actorRol: 'ADMIN',
    });
    expect(worker.ok).toBe(true);
    if (!worker.ok) return;

    const result = worker.value.cambiarRol(
      'SUPERADMIN',
      credencialNavegador(),
      UsuarioId.of(ID_ACTOR),
      'SUPERADMIN',
      AHORA,
      'evento-id-10',
      false,
    );
    expect(result.ok).toBe(true);
  });

  it('cambiar rol de usuario deshabilitado es rechazado', () => {
    const admin = crearUsuario({
      id: ID_ADMIN,
      rol: 'ADMIN',
      credencial: credencialNavegador(),
      actorRol: 'SUPERADMIN',
    });
    expect(admin.ok).toBe(true);
    if (!admin.ok) return;

    const deshabilitado = admin.value.deshabilitar(
      UsuarioId.of(ID_ACTOR),
      'baja',
      AHORA,
      'evento-id-11',
      false,
    );
    expect(deshabilitado.ok).toBe(true);
    if (!deshabilitado.ok) return;

    const result = deshabilitado.value.cambiarRol(
      'WORKER',
      credencialTablet(),
      UsuarioId.of(ID_ACTOR),
      'SUPERADMIN',
      AHORA,
      'evento-id-12',
      false,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(UsuarioNoActivoError);
    }
  });
});

// ──────────────────────────────────────────────────────────────
// Invariante 7: Bootstrap — primer SUPERADMIN sin actor
// ──────────────────────────────────────────────────────────────

describe('Usuario — bootstrap del primer SUPERADMIN', () => {
  it('permite crear primer SUPERADMIN con actorRol=null y creadoPor=null', () => {
    const result = Usuario.crear(
      {
        id: UsuarioId.of(ID_SUPERADMIN),
        email: emailValido('bootstrap'),
        nombre: nombreValido('Admin Bootstrap'),
        rol: 'SUPERADMIN',
        credencial: credencialNavegador(),
        ahora: AHORA,
        creadoPor: null,
        actorRol: null,
      },
      'evento-bootstrap-1',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.rol).toBe('SUPERADMIN');
      expect(result.value.creadoPor).toBeNull();
    }
  });

  it('emite evento UsuarioCreado en el bootstrap', () => {
    const result = Usuario.crear(
      {
        id: UsuarioId.of(ID_SUPERADMIN),
        email: emailValido('bootstrap'),
        nombre: nombreValido('Admin Bootstrap'),
        rol: 'SUPERADMIN',
        credencial: credencialNavegador(),
        ahora: AHORA,
        creadoPor: null,
        actorRol: null,
      },
      'evento-bootstrap-2',
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const eventos = result.value.pullDomainEvents();
    expect(eventos).toHaveLength(1);
    expect(eventos[0]?.tipo).toBe('UsuarioCreado');
  });
});

// ──────────────────────────────────────────────────────────────
// cambiarContrasena
// ──────────────────────────────────────────────────────────────

describe('Usuario — cambiarContrasena', () => {
  it('usuario con credencial navegador puede cambiar su contraseña', () => {
    const creado = crearUsuario({
      id: ID_ADMIN,
      rol: 'ADMIN',
      credencial: credencialNavegador(),
      actorRol: 'SUPERADMIN',
    });
    expect(creado.ok).toBe(true);
    if (!creado.ok) return;

    const nuevoHash = HashDeContrasena.deCadenaYaHasheada('$argon2id$v=19$nuevo-hash');
    const result = creado.value.cambiarContrasena(nuevoHash, AHORA, 'evt-cambio-pw');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const tipos = result.value.pullDomainEvents().map((e) => e.tipo);
    expect(tipos).toContain('ContrasenaDeUsuarioCambiada');
  });

  it('WORKER con credencial tablet no puede cambiar contraseña', () => {
    const creado = crearUsuario({
      id: ID_WORKER,
      rol: 'WORKER',
      credencial: credencialTablet(),
      actorRol: 'ADMIN',
    });
    expect(creado.ok).toBe(true);
    if (!creado.ok) return;

    const nuevoHash = HashDeContrasena.deCadenaYaHasheada('$argon2id$v=19$hash-worker');
    const result = creado.value.cambiarContrasena(nuevoHash, AHORA, 'evt-pw-worker');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(CredencialIncoherenteConRolError);
    }
  });

  it('usuario deshabilitado no puede cambiar contraseña', () => {
    const creado = crearUsuario({
      id: ID_ADMIN,
      rol: 'ADMIN',
      credencial: credencialNavegador(),
      actorRol: 'SUPERADMIN',
    });
    expect(creado.ok).toBe(true);
    if (!creado.ok) return;

    const deshabilitado = creado.value.deshabilitar(
      UsuarioId.of(ID_ACTOR),
      'baja',
      AHORA,
      'evt-baja-pw',
      false,
    );
    expect(deshabilitado.ok).toBe(true);
    if (!deshabilitado.ok) return;

    const nuevoHash = HashDeContrasena.deCadenaYaHasheada('$argon2id$v=19$hash-disabled');
    const result = deshabilitado.value.cambiarContrasena(nuevoHash, AHORA, 'evt-pw-disabled');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(UsuarioNoActivoError);
    }
  });
});

// ──────────────────────────────────────────────────────────────
// cambiarPin
// ──────────────────────────────────────────────────────────────

describe('Usuario — cambiarPin', () => {
  it('WORKER con credencial tablet puede cambiar su PIN', () => {
    const creado = crearUsuario({
      id: ID_WORKER,
      rol: 'WORKER',
      credencial: credencialTablet(),
      actorRol: 'ADMIN',
    });
    expect(creado.ok).toBe(true);
    if (!creado.ok) return;

    const nuevoHashPin = HashDePin.deCadenaYaHasheada('$argon2id$v=19$nuevo-hashpin');
    const result = creado.value.cambiarPin(nuevoHashPin, AHORA, 'evt-cambio-pin');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const tipos = result.value.pullDomainEvents().map((e) => e.tipo);
    expect(tipos).toContain('PinDeUsuarioCambiado');
  });

  it('ADMIN con credencial navegador no puede cambiar PIN', () => {
    const creado = crearUsuario({
      id: ID_ADMIN,
      rol: 'ADMIN',
      credencial: credencialNavegador(),
      actorRol: 'SUPERADMIN',
    });
    expect(creado.ok).toBe(true);
    if (!creado.ok) return;

    const nuevoHashPin = HashDePin.deCadenaYaHasheada('$argon2id$v=19$hashpin-admin');
    const result = creado.value.cambiarPin(nuevoHashPin, AHORA, 'evt-pin-admin');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(CredencialIncoherenteConRolError);
    }
  });

  it('usuario deshabilitado no puede cambiar PIN', () => {
    const creado = crearUsuario({
      id: ID_WORKER,
      rol: 'WORKER',
      credencial: credencialTablet(),
      actorRol: 'ADMIN',
    });
    expect(creado.ok).toBe(true);
    if (!creado.ok) return;

    const deshabilitado = creado.value.deshabilitar(
      UsuarioId.of(ID_ACTOR),
      'baja',
      AHORA,
      'evt-baja-pin',
      false,
    );
    expect(deshabilitado.ok).toBe(true);
    if (!deshabilitado.ok) return;

    const nuevoHashPin = HashDePin.deCadenaYaHasheada('$argon2id$v=19$hashpin-disabled');
    const result = deshabilitado.value.cambiarPin(nuevoHashPin, AHORA, 'evt-pin-disabled');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(UsuarioNoActivoError);
    }
  });
});

// ──────────────────────────────────────────────────────────────
// registrarSecretoTotp y confirmarTotp
// ──────────────────────────────────────────────────────────────

describe('Usuario — registrarSecretoTotp y confirmarTotp', () => {
  it('ADMIN puede registrar secreto TOTP y queda con totpVerificado=false', () => {
    const creado = crearUsuario({
      id: ID_ADMIN,
      rol: 'ADMIN',
      credencial: credencialNavegador(),
      actorRol: 'SUPERADMIN',
    });
    expect(creado.ok).toBe(true);
    if (!creado.ok) return;

    const secreto = SecretoTotp.de('JBSWY3DPEHPK3PXP');
    const result = creado.value.registrarSecretoTotp(secreto, AHORA, 'evt-totp-reg');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.credencial.tipo).toBe('navegador');
    if (result.value.credencial.tipo === 'navegador') {
      expect(result.value.credencial.totpVerificado).toBe(false);
    }
    const tipos = result.value.pullDomainEvents().map((e) => e.tipo);
    expect(tipos).toContain('SecretoTotpRegenerado');
  });

  it('WORKER con credencial tablet no puede registrar secreto TOTP', () => {
    const creado = crearUsuario({
      id: ID_WORKER,
      rol: 'WORKER',
      credencial: credencialTablet(),
      actorRol: 'ADMIN',
    });
    expect(creado.ok).toBe(true);
    if (!creado.ok) return;

    const secreto = SecretoTotp.de('JBSWY3DPEHPK3PXP');
    const result = creado.value.registrarSecretoTotp(secreto, AHORA, 'evt-totp-worker');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(CredencialIncoherenteConRolError);
    }
  });

  it('confirmarTotp pone totpVerificado=true y emite TotpDeUsuarioVerificado', () => {
    const creado = crearUsuario({
      id: ID_ADMIN,
      rol: 'ADMIN',
      credencial: credencialNavegador(),
      actorRol: 'SUPERADMIN',
    });
    expect(creado.ok).toBe(true);
    if (!creado.ok) return;

    const confirmado = creado.value.confirmarTotp(AHORA, 'evt-totp-confirm');
    expect(confirmado.ok).toBe(true);
    if (!confirmado.ok) return;

    expect(confirmado.value.credencial.tipo).toBe('navegador');
    if (confirmado.value.credencial.tipo === 'navegador') {
      expect(confirmado.value.credencial.totpVerificado).toBe(true);
    }
    const tipos = confirmado.value.pullDomainEvents().map((e) => e.tipo);
    expect(tipos).toContain('TotpDeUsuarioVerificado');
  });

  it('WORKER no puede confirmar TOTP', () => {
    const creado = crearUsuario({
      id: ID_WORKER,
      rol: 'WORKER',
      credencial: credencialTablet(),
      actorRol: 'ADMIN',
    });
    expect(creado.ok).toBe(true);
    if (!creado.ok) return;

    const result = creado.value.confirmarTotp(AHORA, 'evt-totp-worker-confirm');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(CredencialIncoherenteConRolError);
    }
  });
});

// ──────────────────────────────────────────────────────────────
// rehabilitar
// ──────────────────────────────────────────────────────────────

describe('Usuario — rehabilitar', () => {
  it('usuario deshabilitado puede ser rehabilitado', () => {
    const creado = crearUsuario({
      id: ID_ADMIN,
      rol: 'ADMIN',
      credencial: credencialNavegador(),
      actorRol: 'SUPERADMIN',
    });
    expect(creado.ok).toBe(true);
    if (!creado.ok) return;

    const deshabilitado = creado.value.deshabilitar(
      UsuarioId.of(ID_ACTOR),
      'temporal',
      AHORA,
      'evt-baja-rehab',
      false,
    );
    expect(deshabilitado.ok).toBe(true);
    if (!deshabilitado.ok) return;

    const rehabilitado = deshabilitado.value.rehabilitar(
      UsuarioId.of(ID_ACTOR),
      AHORA,
      'evt-rehab',
    );
    expect(rehabilitado.ok).toBe(true);
    if (!rehabilitado.ok) return;
    expect(rehabilitado.value.estado).toBe('activo');

    const tipos = rehabilitado.value.pullDomainEvents().map((e) => e.tipo);
    expect(tipos).toContain('UsuarioRehabilitado');
  });

  it('rehabilitar un usuario ya activo devuelve UsuarioNoActivoError', () => {
    const creado = crearUsuario({
      id: ID_ADMIN,
      rol: 'ADMIN',
      credencial: credencialNavegador(),
      actorRol: 'SUPERADMIN',
    });
    expect(creado.ok).toBe(true);
    if (!creado.ok) return;

    const result = creado.value.rehabilitar(UsuarioId.of(ID_ACTOR), AHORA, 'evt-rehab-activo');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(UsuarioNoActivoError);
    }
  });
});

// ──────────────────────────────────────────────────────────────
// reconstituir
// ──────────────────────────────────────────────────────────────

describe('Usuario — reconstituir', () => {
  it('reconstituir crea usuario sin emitir eventos', () => {
    const usuario = Usuario.reconstituir({
      id: UsuarioId.of(ID_ADMIN),
      email: emailValido('reconstituido'),
      nombre: nombreValido('Reconstruido Test'),
      rol: 'ADMIN',
      estado: 'activo',
      credencial: credencialNavegador(),
      creadoEn: AHORA,
      creadoPor: null,
    });
    expect(usuario.rol).toBe('ADMIN');
    expect(usuario.estado).toBe('activo');
    expect(usuario.pullDomainEvents()).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────────────────────
// Eventos de dominio emitidos
// ──────────────────────────────────────────────────────────────

describe('Usuario — eventos de dominio', () => {
  it('crear emite UsuarioCreado con los datos correctos', () => {
    const id = ID_ADMIN;
    const result = crearUsuario({ id, rol: 'ADMIN', actorRol: 'SUPERADMIN' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const eventos = result.value.pullDomainEvents();
    expect(eventos).toHaveLength(1);
    const evento = eventos[0];
    expect(evento?.tipo).toBe('UsuarioCreado');
    expect(evento?.aggregateId).toBe(id);
  });

  it('deshabilitar emite UsuarioDeshabilitado', () => {
    const creado = crearUsuario({ id: ID_ADMIN, rol: 'ADMIN', actorRol: 'SUPERADMIN' });
    expect(creado.ok).toBe(true);
    if (!creado.ok) return;

    const result = creado.value.deshabilitar(
      UsuarioId.of(ID_ACTOR),
      'baja por prueba',
      AHORA,
      'evt-deshabilitar',
      false,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const eventos = result.value.pullDomainEvents();
    const tipos = eventos.map((e) => e.tipo);
    expect(tipos).toContain('UsuarioDeshabilitado');
  });

  it('cambiarRol emite RolDeUsuarioCambiado', () => {
    const creado = crearUsuario({ id: ID_ADMIN, rol: 'ADMIN', actorRol: 'SUPERADMIN' });
    expect(creado.ok).toBe(true);
    if (!creado.ok) return;

    const result = creado.value.cambiarRol(
      'WORKER',
      credencialTablet(),
      UsuarioId.of(ID_ACTOR),
      'SUPERADMIN',
      AHORA,
      'evt-cambio-rol',
      false,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const tipos = result.value.pullDomainEvents().map((e) => e.tipo);
    expect(tipos).toContain('RolDeUsuarioCambiado');
  });
});
