import { vi } from 'vitest';
import {
  UsuarioId,
  SesionId,
  DispositivoId,
  Email,
  NombreCompleto,
  FechaHora,
  HashDeContrasena,
  HashDePin,
  SecretoTotp,
  PoliticaDeSesion,
  Usuario,
  Sesion,
  ok,
  DomainError,
  type Result,
  type Credencial,
  type Rol,
} from '@zahavi/domain-identity';
import type {
  RepositorioDeUsuarios,
  RepositorioDeSesiones,
  RepositorioDeDispositivosAutorizados,
  VerificadorDeContrasena,
  VerificadorDePin,
  VerificadorDeTotp,
  Reloj,
  GeneradorDeIds,
  PoliticaDeSesionPorRol,
  PublicadorDeDomainEvents,
} from '@zahavi/ports';

function unwrap<T>(result: Result<T, DomainError>): T {
  if (!result.ok) throw new Error(`unwrap en test falló: ${result.error.message}`);
  return result.value;
}

// ── UUIDs fijos para tests ────────────────────────────────────────

export const UUID_USUARIO = '11111111-1111-1111-1111-111111111111';
export const UUID_SESION = '22222222-2222-2222-2222-222222222222';
export const UUID_DISPOSITIVO = '33333333-3333-3333-3333-333333333333';
export const UUID_ACTOR = '44444444-4444-4444-4444-444444444444';
export const UUID_EVENTO = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

export const AHORA = FechaHora.deTimestamp(1_700_000_000_000);
export const HASH_CONTRASENA_VALIDO = HashDeContrasena.deCadenaYaHasheada(
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8n/UrH9v2g7uHyxKlyu',
);
export const HASH_PIN_VALIDO = HashDePin.deCadenaYaHasheada(
  '$2b$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8n/UrH9v2g7uHyxKlyu',
);
export const SECRETO_TOTP = SecretoTotp.de('JBSWY3DPEHPK3PXP');

// ── Factories de aggregates ───────────────────────────────────────

export function crearUsuarioNavegador(
  overrides: {
    rol?: Rol;
    totpVerificado?: boolean;
    secretoTotp?: SecretoTotp | null;
    estado?: 'activo' | 'deshabilitado';
  } = {},
): Usuario {
  const cred: Credencial = {
    tipo: 'navegador',
    hashDeContrasena: HASH_CONTRASENA_VALIDO,
    secretoTotp: overrides.secretoTotp !== undefined ? overrides.secretoTotp : SECRETO_TOTP,
    totpVerificado: overrides.totpVerificado ?? true,
  };
  return Usuario.reconstituir({
    id: UsuarioId.of(UUID_USUARIO),
    email: unwrap(Email.of('test@zahavi.co')),
    nombre: unwrap(NombreCompleto.of('Test Usuario')),
    rol: overrides.rol ?? 'ADMIN',
    estado: overrides.estado ?? 'activo',
    credencial: cred,
    creadoEn: AHORA,
    creadoPor: null,
  });
}

export function crearUsuarioTablet(): Usuario {
  const cred: Credencial = {
    tipo: 'tablet',
    hashDePin: HASH_PIN_VALIDO,
  };
  return Usuario.reconstituir({
    id: UsuarioId.of(UUID_USUARIO),
    email: unwrap(Email.of('worker@zahavi.co')),
    nombre: unwrap(NombreCompleto.of('Worker Uno')),
    rol: 'WORKER',
    estado: 'activo',
    credencial: cred,
    creadoEn: AHORA,
    creadoPor: null,
  });
}

export function crearSesionActiva(usuarioId = UUID_USUARIO): Sesion {
  const politica = PoliticaDeSesion.porRol('ADMIN');
  return Sesion.reconstituir({
    id: SesionId.of(UUID_SESION),
    usuarioId: UsuarioId.of(usuarioId),
    rol: 'ADMIN',
    dispositivoId: null,
    politica,
    contextoDispositivo: 'personal',
    iniciadaEn: AHORA,
    ultimaActividadEn: AHORA,
    expiraEnAbsoluto: AHORA.masMillisegundos(politica.topeAbsoluto.toMs()),
    estadoSesion: 'activa',
    estadoBloqueo: 'desbloqueada',
    bloqueadaEn: null,
    cerradaEn: null,
    motivoDeCierre: null,
  });
}

export function crearSesionCerrada(usuarioId = UUID_USUARIO): Sesion {
  const politica = PoliticaDeSesion.porRol('ADMIN');
  return Sesion.reconstituir({
    id: SesionId.of(UUID_SESION),
    usuarioId: UsuarioId.of(usuarioId),
    rol: 'ADMIN',
    dispositivoId: null,
    politica,
    contextoDispositivo: 'personal',
    iniciadaEn: AHORA,
    ultimaActividadEn: AHORA,
    expiraEnAbsoluto: AHORA.masMillisegundos(politica.topeAbsoluto.toMs()),
    estadoSesion: 'cerrada',
    estadoBloqueo: 'desbloqueada',
    bloqueadaEn: null,
    cerradaEn: AHORA,
    motivoDeCierre: 'cierre_voluntario',
  });
}

// ── Mock de puertos ───────────────────────────────────────────────

export function makeMockReposUsuarios(
  overrides: Partial<RepositorioDeUsuarios> = {},
): RepositorioDeUsuarios {
  return {
    obtenerPorId: vi.fn().mockResolvedValue(null),
    obtenerPorEmail: vi.fn().mockResolvedValue(null),
    existeEmail: vi.fn().mockResolvedValue(false),
    guardar: vi.fn().mockResolvedValue(undefined),
    contarSuperadminsActivos: vi.fn().mockResolvedValue(2),
    listarSuperadminsActivos: vi.fn().mockResolvedValue([]),
    listar: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

export function makeMockReposSesiones(
  overrides: Partial<RepositorioDeSesiones> = {},
): RepositorioDeSesiones {
  return {
    obtenerPorId: vi.fn().mockResolvedValue(null),
    guardar: vi.fn().mockResolvedValue(undefined),
    listarActivasDeUsuario: vi.fn().mockResolvedValue([]),
    contarActivasDeUsuario: vi.fn().mockResolvedValue(0),
    listarActivasDeDispositivo: vi.fn().mockResolvedValue([]),
    listarPotencialmenteExpiradas: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

export function makeMockReposDispositivos(
  overrides: Partial<RepositorioDeDispositivosAutorizados> = {},
): RepositorioDeDispositivosAutorizados {
  return {
    obtenerPorId: vi.fn().mockResolvedValue(null),
    guardar: vi.fn().mockResolvedValue(undefined),
    existeNombre: vi.fn().mockResolvedValue(false),
    listarActivos: vi.fn().mockResolvedValue([]),
    estaActivo: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

export function makeMockVerifContrasena(
  overrides: Partial<VerificadorDeContrasena> = {},
): VerificadorDeContrasena {
  return {
    verificar: vi.fn().mockResolvedValue(true),
    hashear: vi.fn().mockResolvedValue(HASH_CONTRASENA_VALIDO),
    validarPolitica: vi.fn().mockReturnValue(ok(undefined)),
    ...overrides,
  };
}

export function makeMockVerifPin(overrides: Partial<VerificadorDePin> = {}): VerificadorDePin {
  return {
    verificar: vi.fn().mockResolvedValue(true),
    hashear: vi.fn().mockResolvedValue(HASH_PIN_VALIDO),
    validarFormato: vi.fn().mockReturnValue(ok(undefined)),
    ...overrides,
  };
}

export function makeMockVerifTotp(overrides: Partial<VerificadorDeTotp> = {}): VerificadorDeTotp {
  return {
    verificar: vi.fn().mockResolvedValue(true),
    generarSecreto: vi.fn().mockResolvedValue(SECRETO_TOTP),
    urlDeEnrolamiento: vi
      .fn()
      .mockReturnValue(
        'otpauth://totp/Zahavi:test@zahavi.co?secret=JBSWY3DPEHPK3PXP&issuer=Zahavi',
      ),
    ...overrides,
  };
}

export function makeMockReloj(): Reloj {
  return { ahora: vi.fn().mockReturnValue(AHORA) };
}

export function makeMockIds(): GeneradorDeIds {
  return {
    generarUsuarioId: vi.fn().mockReturnValue(UsuarioId.of(UUID_USUARIO)),
    generarSesionId: vi.fn().mockReturnValue(SesionId.of(UUID_SESION)),
    generarDispositivoId: vi.fn().mockReturnValue(DispositivoId.of(UUID_DISPOSITIVO)),
    generarEventoId: vi.fn().mockReturnValue(UUID_EVENTO),
  };
}

export function makeMockPolitica(): PoliticaDeSesionPorRol {
  return { obtener: vi.fn().mockImplementation((rol: Rol) => PoliticaDeSesion.porRol(rol)) };
}

export function makeMockEventos(): PublicadorDeDomainEvents {
  return { publicar: vi.fn().mockResolvedValue(undefined) };
}
