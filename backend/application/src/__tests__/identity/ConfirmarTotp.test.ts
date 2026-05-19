import { describe, it, expect, vi } from 'vitest';
import { ConfirmarTotp } from '../../identity/ConfirmarTotp.js';
import {
  makeMockReposUsuarios,
  makeMockVerifTotp,
  makeMockReloj,
  makeMockIds,
  makeMockEventos,
  crearUsuarioNavegador,
  crearUsuarioTablet,
  UUID_USUARIO,
} from './helpers.js';

function makeUseCase(
  overrides: {
    usuario?: ReturnType<typeof crearUsuarioNavegador> | null;
    totpOk?: boolean;
  } = {},
) {
  const usuario =
    overrides.usuario !== undefined
      ? overrides.usuario
      : crearUsuarioNavegador({ totpVerificado: false });
  const repos = makeMockReposUsuarios({
    obtenerPorId: vi.fn().mockResolvedValue(usuario),
  });
  const verifTotp = makeMockVerifTotp({
    verificar: vi.fn().mockResolvedValue(overrides.totpOk ?? true),
  });
  const reloj = makeMockReloj();
  const ids = makeMockIds();
  const eventos = makeMockEventos();
  const uc = new ConfirmarTotp(repos, verifTotp, reloj, ids, eventos);
  return { uc, repos, verifTotp, eventos };
}

describe('ConfirmarTotp', () => {
  it('happy path: confirma TOTP y actualiza el usuario', async () => {
    const { uc, repos, eventos } = makeUseCase();
    const result = await uc.execute({ usuarioId: UUID_USUARIO, codigoTotp: '123456' });

    expect(result.ok).toBe(true);
    expect(repos.guardar).toHaveBeenCalledOnce();
    expect(eventos.publicar).toHaveBeenCalledOnce();
  });

  it('retorna UsuarioNoEncontradoError si el usuario no existe', async () => {
    const { uc } = makeUseCase({ usuario: null });
    const result = await uc.execute({ usuarioId: UUID_USUARIO, codigoTotp: '123456' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('IDENTITY_USUARIO_NO_ENCONTRADO');
  });

  it('retorna TotpNoVerificadoError si el usuario es tablet (sin credencial navegador)', async () => {
    const { uc } = makeUseCase({ usuario: crearUsuarioTablet() });
    const result = await uc.execute({ usuarioId: UUID_USUARIO, codigoTotp: '123456' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('IDENTITY_TOTP_NO_VERIFICADO');
  });

  it('retorna TotpNoVerificadoError si el secreto TOTP es null (enrolamiento no iniciado)', async () => {
    const { uc } = makeUseCase({
      usuario: crearUsuarioNavegador({ totpVerificado: false, secretoTotp: null }),
    });
    const result = await uc.execute({ usuarioId: UUID_USUARIO, codigoTotp: '123456' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('IDENTITY_TOTP_NO_VERIFICADO');
  });

  it('retorna CredencialesInvalidasError si el código TOTP es incorrecto', async () => {
    const { uc } = makeUseCase({ totpOk: false });
    const result = await uc.execute({ usuarioId: UUID_USUARIO, codigoTotp: '000000' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('IDENTITY_CREDENCIALES_INVALIDAS');
  });

  it('no guarda ni publica si el código es incorrecto', async () => {
    const { uc, repos, eventos } = makeUseCase({ totpOk: false });
    await uc.execute({ usuarioId: UUID_USUARIO, codigoTotp: '000000' });

    expect(repos.guardar).not.toHaveBeenCalled();
    expect(eventos.publicar).not.toHaveBeenCalled();
  });
});
