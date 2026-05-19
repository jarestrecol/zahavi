import { describe, it, expect, vi } from 'vitest';
import { CerrarSesion } from '../../identity/CerrarSesion.js';
import {
  makeMockReposSesiones,
  makeMockReloj,
  makeMockIds,
  makeMockEventos,
  crearSesionActiva,
  crearSesionCerrada,
  UUID_SESION,
  UUID_USUARIO,
} from './helpers.js';

function makeUseCase(sesion: ReturnType<typeof crearSesionActiva> | null = crearSesionActiva()) {
  const reposSesiones = makeMockReposSesiones({
    obtenerPorId: vi.fn().mockResolvedValue(sesion),
  });
  const reloj = makeMockReloj();
  const ids = makeMockIds();
  const eventos = makeMockEventos();
  const uc = new CerrarSesion(reposSesiones, reloj, ids, eventos);
  return { uc, reposSesiones, eventos };
}

describe('CerrarSesion', () => {
  it('happy path: cierra la sesión voluntariamente', async () => {
    const { uc, reposSesiones, eventos } = makeUseCase();
    const result = await uc.execute({ sesionId: UUID_SESION, usuarioId: UUID_USUARIO });

    expect(result.ok).toBe(true);
    expect(reposSesiones.guardar).toHaveBeenCalledOnce();
    expect(eventos.publicar).toHaveBeenCalledOnce();
    expect(reposSesiones.guardar).toHaveBeenCalledWith(
      expect.objectContaining({ estadoSesion: 'cerrada', motivoDeCierre: 'cierre_voluntario' }),
    );
  });

  it('retorna SesionNoEncontradaError si la sesión no existe', async () => {
    const { uc } = makeUseCase(null);
    const result = await uc.execute({ sesionId: UUID_SESION, usuarioId: UUID_USUARIO });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('IDENTITY_SESION_NO_ENCONTRADA');
  });

  it('retorna SesionYaCerradaError si la sesión ya estaba cerrada', async () => {
    const { uc: uc2 } = makeUseCase(crearSesionCerrada());
    const result = await uc2.execute({ sesionId: UUID_SESION, usuarioId: UUID_USUARIO });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('IDENTITY_SESION_YA_CERRADA');
  });

  it('lanza Error si el usuarioId no coincide con el dueño de la sesión (invariante de seguridad)', async () => {
    const { uc } = makeUseCase();
    const OTRO_USUARIO = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

    await expect(uc.execute({ sesionId: UUID_SESION, usuarioId: OTRO_USUARIO })).rejects.toThrow(
      'Intento de cerrar sesión ajena',
    );
  });
});
