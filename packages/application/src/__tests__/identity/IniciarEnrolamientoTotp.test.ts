import { describe, it, expect, vi } from 'vitest';
import { IniciarEnrolamientoTotp } from '../../identity/IniciarEnrolamientoTotp.js';
import {
  makeMockReposUsuarios,
  makeMockVerifTotp,
  makeMockReloj,
  makeMockIds,
  makeMockEventos,
  crearUsuarioNavegador,
  crearUsuarioTablet,
  UUID_USUARIO,
  SECRETO_TOTP,
} from './helpers.js';

function makeUseCase(
  overrides: {
    usuario?: ReturnType<typeof crearUsuarioNavegador> | null;
  } = {},
) {
  const usuario =
    overrides.usuario !== undefined
      ? overrides.usuario
      : crearUsuarioNavegador({ totpVerificado: false, secretoTotp: null });
  const repos = makeMockReposUsuarios({
    obtenerPorId: vi.fn().mockResolvedValue(usuario),
  });
  const verifTotp = makeMockVerifTotp();
  const reloj = makeMockReloj();
  const ids = makeMockIds();
  const eventos = makeMockEventos();
  const uc = new IniciarEnrolamientoTotp(repos, verifTotp, reloj, ids, eventos);
  return { uc, repos, verifTotp, eventos };
}

describe('IniciarEnrolamientoTotp', () => {
  it('happy path: genera secreto y retorna URL + base32', async () => {
    const { uc, repos, eventos } = makeUseCase();
    const result = await uc.execute({ usuarioId: UUID_USUARIO });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.secretoBase32).toBe(SECRETO_TOTP._unsafeRead());
    expect(result.value.otpAuthUrl).toContain('otpauth://totp/');

    expect(repos.guardar).toHaveBeenCalledOnce();
    expect(eventos.publicar).toHaveBeenCalledOnce();
  });

  it('retorna UsuarioNoEncontradoError si el usuario no existe', async () => {
    const { uc } = makeUseCase({ usuario: null });
    const result = await uc.execute({ usuarioId: UUID_USUARIO });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('IDENTITY_USUARIO_NO_ENCONTRADO');
  });

  it('retorna error si el usuario es de tipo tablet (no tiene TOTP)', async () => {
    const { uc } = makeUseCase({ usuario: crearUsuarioTablet() });
    const result = await uc.execute({ usuarioId: UUID_USUARIO });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('IDENTITY_CREDENCIAL_INCOHERENTE');
  });

  it('idempotente: re-iniciar enrolamiento en usuario con secreto previo sobrescribe el secreto', async () => {
    const { uc, repos, verifTotp } = makeUseCase({
      usuario: crearUsuarioNavegador({ totpVerificado: false }),
    });
    const result = await uc.execute({ usuarioId: UUID_USUARIO });

    expect(result.ok).toBe(true);
    expect(verifTotp.generarSecreto).toHaveBeenCalledOnce();
    expect(repos.guardar).toHaveBeenCalledOnce();
  });

  it('no guarda ni publica si el usuario no existe', async () => {
    const { uc, repos, eventos } = makeUseCase({ usuario: null });
    await uc.execute({ usuarioId: UUID_USUARIO });

    expect(repos.guardar).not.toHaveBeenCalled();
    expect(eventos.publicar).not.toHaveBeenCalled();
  });
});
