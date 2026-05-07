import { describe, it, expect, vi } from 'vitest';
import { AsignarRol } from '../../identity/AsignarRol.js';
import { err } from '@zahavi/domain-identity';
import { ContrasenaDebilError, PinInvalidoError } from '@zahavi/domain-identity';
import {
  makeMockReposUsuarios,
  makeMockVerifContrasena,
  makeMockVerifPin,
  makeMockReloj,
  makeMockIds,
  makeMockEventos,
  crearUsuarioNavegador,
  UUID_USUARIO,
  UUID_ACTOR,
} from './helpers.js';

function makeUseCase(
  overrides: {
    objetivo?: ReturnType<typeof crearUsuarioNavegador> | null;
    superadminCount?: number;
    contrasenaOverride?: Parameters<typeof makeMockVerifContrasena>[0];
    pinOverride?: Parameters<typeof makeMockVerifPin>[0];
  } = {},
) {
  const objetivo = overrides.objetivo !== undefined ? overrides.objetivo : crearUsuarioNavegador();
  const repos = makeMockReposUsuarios({
    obtenerPorId: vi.fn().mockResolvedValue(objetivo),
    contarSuperadminsActivos: vi.fn().mockResolvedValue(overrides.superadminCount ?? 2),
  });
  const verifContrasena = makeMockVerifContrasena(overrides.contrasenaOverride);
  const verifPin = makeMockVerifPin(overrides.pinOverride);
  const reloj = makeMockReloj();
  const ids = makeMockIds();
  const eventos = makeMockEventos();
  const uc = new AsignarRol(repos, verifContrasena, verifPin, reloj, ids, eventos);
  return { uc, repos, eventos };
}

describe('AsignarRol', () => {
  it('happy path: SUPERADMIN asigna rol ADMIN con credencial navegador', async () => {
    const { uc, repos, eventos } = makeUseCase();
    const result = await uc.execute({
      actorId: UUID_ACTOR,
      actorRol: 'SUPERADMIN',
      usuarioObjetivoId: UUID_USUARIO,
      nuevoRol: 'ADMIN',
      tipoCredencial: 'navegador',
      contrasenaEnClaro: 'NuevaContraseña!1',
    });

    expect(result.ok).toBe(true);
    expect(repos.guardar).toHaveBeenCalledOnce();
    expect(eventos.publicar).toHaveBeenCalledOnce();
  });

  it('happy path: ADMIN asigna rol WORKER con credencial tablet', async () => {
    const { uc, repos } = makeUseCase({ objetivo: crearUsuarioNavegador({ rol: 'WORKER' }) });
    const result = await uc.execute({
      actorId: UUID_ACTOR,
      actorRol: 'ADMIN',
      usuarioObjetivoId: UUID_USUARIO,
      nuevoRol: 'WORKER',
      tipoCredencial: 'tablet',
      pinEnClaro: '123456',
    });

    expect(result.ok).toBe(true);
    expect(repos.guardar).toHaveBeenCalledOnce();
  });

  it('retorna UsuarioNoEncontradoError si el objetivo no existe', async () => {
    const { uc } = makeUseCase({ objetivo: null });
    const result = await uc.execute({
      actorId: UUID_ACTOR,
      actorRol: 'SUPERADMIN',
      usuarioObjetivoId: UUID_USUARIO,
      nuevoRol: 'ADMIN',
      tipoCredencial: 'navegador',
      contrasenaEnClaro: 'NuevaContraseña!1',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('IDENTITY_USUARIO_NO_ENCONTRADO');
  });

  it('retorna ContrasenaDebilError si la contraseña no cumple la política', async () => {
    const { uc } = makeUseCase({
      contrasenaOverride: {
        validarPolitica: vi.fn().mockReturnValue(err(new ContrasenaDebilError('muy corta'))),
      },
    });
    const result = await uc.execute({
      actorId: UUID_ACTOR,
      actorRol: 'SUPERADMIN',
      usuarioObjetivoId: UUID_USUARIO,
      nuevoRol: 'ADMIN',
      tipoCredencial: 'navegador',
      contrasenaEnClaro: 'debil',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('IDENTITY_CONTRASENA_DEBIL');
  });

  it('retorna PinInvalidoError si el PIN no cumple el formato', async () => {
    const { uc } = makeUseCase({
      pinOverride: {
        validarFormato: vi.fn().mockReturnValue(err(new PinInvalidoError())),
      },
    });
    const result = await uc.execute({
      actorId: UUID_ACTOR,
      actorRol: 'ADMIN',
      usuarioObjetivoId: UUID_USUARIO,
      nuevoRol: 'WORKER',
      tipoCredencial: 'tablet',
      pinEnClaro: 'abc',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('IDENTITY_PIN_INVALIDO');
  });

  it('protege al último SUPERADMIN activo: no permite degradarlo', async () => {
    const { uc } = makeUseCase({
      objetivo: crearUsuarioNavegador({ rol: 'SUPERADMIN' }),
      superadminCount: 1,
    });
    const result = await uc.execute({
      actorId: UUID_ACTOR,
      actorRol: 'SUPERADMIN',
      usuarioObjetivoId: UUID_USUARIO,
      nuevoRol: 'ADMIN',
      tipoCredencial: 'navegador',
      contrasenaEnClaro: 'NuevaContraseña!1',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('IDENTITY_ULTIMO_SUPERADMIN_PROTEGIDO');
  });

  it('no protege si hay más de un SUPERADMIN activo', async () => {
    const { uc } = makeUseCase({
      objetivo: crearUsuarioNavegador({ rol: 'SUPERADMIN' }),
      superadminCount: 2,
    });
    const result = await uc.execute({
      actorId: UUID_ACTOR,
      actorRol: 'SUPERADMIN',
      usuarioObjetivoId: UUID_USUARIO,
      nuevoRol: 'ADMIN',
      tipoCredencial: 'navegador',
      contrasenaEnClaro: 'NuevaContraseña!1',
    });

    expect(result.ok).toBe(true);
  });

  it('ADMIN no puede asignar rol SUPERADMIN', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({
      actorId: UUID_ACTOR,
      actorRol: 'ADMIN',
      usuarioObjetivoId: UUID_USUARIO,
      nuevoRol: 'SUPERADMIN',
      tipoCredencial: 'navegador',
      contrasenaEnClaro: 'NuevaContraseña!1',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('IDENTITY_ROL_NO_AUTORIZADO_CREAR');
  });

  it('no consulta contarSuperadmins si el objetivo no es SUPERADMIN', async () => {
    const { uc, repos } = makeUseCase({ objetivo: crearUsuarioNavegador({ rol: 'ADMIN' }) });
    await uc.execute({
      actorId: UUID_ACTOR,
      actorRol: 'SUPERADMIN',
      usuarioObjetivoId: UUID_USUARIO,
      nuevoRol: 'WORKER',
      tipoCredencial: 'tablet',
      pinEnClaro: '123456',
    });

    expect(repos.contarSuperadminsActivos).not.toHaveBeenCalled();
  });

  it('usuario deshabilitado no puede recibir nuevo rol', async () => {
    const { uc } = makeUseCase({ objetivo: crearUsuarioNavegador({ estado: 'deshabilitado' }) });
    const result = await uc.execute({
      actorId: UUID_ACTOR,
      actorRol: 'SUPERADMIN',
      usuarioObjetivoId: UUID_USUARIO,
      nuevoRol: 'ADMIN',
      tipoCredencial: 'navegador',
      contrasenaEnClaro: 'NuevaContraseña!1',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('IDENTITY_USUARIO_NO_ACTIVO');
  });
});
