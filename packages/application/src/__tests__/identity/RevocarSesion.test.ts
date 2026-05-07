import { describe, it, expect, vi } from 'vitest';
import { RevocarSesion } from '../../identity/RevocarSesion.js';
import {
  makeMockReposSesiones,
  makeMockReposUsuarios,
  makeMockReloj,
  makeMockIds,
  makeMockEventos,
  crearSesionActiva,
  crearUsuarioNavegador,
  crearUsuarioTablet,
  UUID_SESION,
  UUID_ACTOR,
  UUID_USUARIO,
} from './helpers.js';

function makeUseCase({
  sesion = crearSesionActiva(),
  usuarioDuenio = crearUsuarioNavegador({ rol: 'ADMIN' }),
}: {
  sesion?: ReturnType<typeof crearSesionActiva> | null;
  usuarioDuenio?: ReturnType<typeof crearUsuarioNavegador> | null;
} = {}) {
  const reposSesiones = makeMockReposSesiones({
    obtenerPorId: vi.fn().mockResolvedValue(sesion),
  });
  const reposUsuarios = makeMockReposUsuarios({
    obtenerPorId: vi.fn().mockResolvedValue(usuarioDuenio),
  });
  const reloj = makeMockReloj();
  const ids = makeMockIds();
  const eventos = makeMockEventos();
  const uc = new RevocarSesion(reposSesiones, reposUsuarios, reloj, ids, eventos);
  return { uc, reposSesiones, eventos };
}

describe('RevocarSesion', () => {
  it('SUPERADMIN puede revocar cualquier sesión', async () => {
    const { uc, reposSesiones, eventos } = makeUseCase();
    const result = await uc.execute({
      actorId: UUID_ACTOR,
      actorRol: 'SUPERADMIN',
      sesionId: UUID_SESION,
    });

    expect(result.ok).toBe(true);
    expect(reposSesiones.guardar).toHaveBeenCalledOnce();
    expect(eventos.publicar).toHaveBeenCalledOnce();
    expect(reposSesiones.guardar).toHaveBeenCalledWith(
      expect.objectContaining({ estadoSesion: 'revocada', motivoDeCierre: 'revocada_por_admin' }),
    );
  });

  it('ADMIN puede revocar sesión de WORKER', async () => {
    const { uc } = makeUseCase({ usuarioDuenio: crearUsuarioTablet() });
    const result = await uc.execute({
      actorId: UUID_ACTOR,
      actorRol: 'ADMIN',
      sesionId: UUID_SESION,
    });
    expect(result.ok).toBe(true);
  });

  it('ADMIN no puede revocar sesión de otro ADMIN', async () => {
    const { uc } = makeUseCase({ usuarioDuenio: crearUsuarioNavegador({ rol: 'ADMIN' }) });
    const result = await uc.execute({
      actorId: UUID_ACTOR,
      actorRol: 'ADMIN',
      sesionId: UUID_SESION,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('IDENTITY_ROL_NO_AUTORIZADO_CREAR');
  });

  it('WORKER no puede revocar ninguna sesión', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({
      actorId: UUID_USUARIO,
      actorRol: 'WORKER',
      sesionId: UUID_SESION,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('IDENTITY_ROL_NO_AUTORIZADO_CREAR');
  });

  it('retorna SesionNoEncontradaError si la sesión no existe', async () => {
    const { uc } = makeUseCase({ sesion: null });
    const result = await uc.execute({
      actorId: UUID_ACTOR,
      actorRol: 'SUPERADMIN',
      sesionId: UUID_SESION,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('IDENTITY_SESION_NO_ENCONTRADA');
  });

  it('retorna UsuarioNoEncontradoError si no se encuentra el dueño de la sesión', async () => {
    const { uc } = makeUseCase({ usuarioDuenio: null });
    const result = await uc.execute({
      actorId: UUID_ACTOR,
      actorRol: 'SUPERADMIN',
      sesionId: UUID_SESION,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('IDENTITY_USUARIO_NO_ENCONTRADO');
  });

  it('es idempotente: revocar una sesión ya cerrada no falla', async () => {
    // Cerrar la sesión en el dominio primero
    const sesionAbierta = crearSesionActiva();
    const sesionRevocada = sesionAbierta.revocar(
      'revocada_por_admin',
      makeMockReloj().ahora(),
      'evt-1',
      null,
    );

    const { uc } = makeUseCase({ sesion: sesionRevocada });
    const result = await uc.execute({
      actorId: UUID_ACTOR,
      actorRol: 'SUPERADMIN',
      sesionId: UUID_SESION,
    });
    // La revocación es idempotente en el dominio: si ya está cerrada, no emite nuevos eventos
    expect(result.ok).toBe(true);
  });
});
