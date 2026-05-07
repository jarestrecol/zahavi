import { describe, it, expect, vi } from 'vitest';
import { RegistrarUsuario } from '../../identity/RegistrarUsuario.js';
import { err } from '@zahavi/domain-identity';
import { ContrasenaDebilError } from '@zahavi/domain-identity';
import {
  makeMockReposUsuarios,
  makeMockVerifContrasena,
  makeMockVerifPin,
  makeMockReloj,
  makeMockIds,
  makeMockEventos,
  UUID_USUARIO,
} from './helpers.js';

function makeUseCase(
  overrides: {
    reposOverride?: Parameters<typeof makeMockReposUsuarios>[0];
    contrasenaOverride?: Parameters<typeof makeMockVerifContrasena>[0];
    pinOverride?: Parameters<typeof makeMockVerifPin>[0];
  } = {},
) {
  const repos = makeMockReposUsuarios(overrides.reposOverride);
  const verifContrasena = makeMockVerifContrasena(overrides.contrasenaOverride);
  const verifPin = makeMockVerifPin(overrides.pinOverride);
  const reloj = makeMockReloj();
  const ids = makeMockIds();
  const eventos = makeMockEventos();
  const uc = new RegistrarUsuario(repos, verifContrasena, verifPin, reloj, ids, eventos);
  return { uc, repos, verifContrasena, verifPin, eventos };
}

describe('RegistrarUsuario', () => {
  describe('flujo navegador (ADMIN)', () => {
    it('happy path: crea usuario, guarda y publica eventos', async () => {
      const { uc, repos, eventos } = makeUseCase();

      const result = await uc.execute({
        email: 'admin@zahavi.co',
        nombreCompleto: 'Ana García',
        rol: 'ADMIN',
        tipoCredencial: 'navegador',
        contrasenaEnClaro: 'Secr3t@PaSSword!',
        actorId: '44444444-4444-4444-4444-444444444444',
        actorRol: 'SUPERADMIN',
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.usuarioId).toBe(UUID_USUARIO);
      expect(result.value.email).toBe('admin@zahavi.co');
      expect(result.value.rol).toBe('ADMIN');

      expect(repos.guardar).toHaveBeenCalledOnce();
      expect(eventos.publicar).toHaveBeenCalledOnce();
      expect(eventos.publicar).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ tipo: 'UsuarioCreado' })]),
      );
    });

    it('rechaza email inválido', async () => {
      const { uc } = makeUseCase();
      const result = await uc.execute({
        email: 'no-es-un-email',
        nombreCompleto: 'Ana García',
        rol: 'ADMIN',
        tipoCredencial: 'navegador',
        contrasenaEnClaro: 'Secr3t@PaSSword!',
        actorId: null,
        actorRol: null,
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('IDENTITY_EMAIL_INVALIDO');
    });

    it('rechaza nombre vacío o muy corto', async () => {
      const { uc } = makeUseCase();
      const result = await uc.execute({
        email: 'admin@zahavi.co',
        nombreCompleto: 'X',
        rol: 'ADMIN',
        tipoCredencial: 'navegador',
        contrasenaEnClaro: 'Secr3t@PaSSword!',
        actorId: null,
        actorRol: null,
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('IDENTITY_NOMBRE_INVALIDO');
    });

    it('rechaza email ya registrado', async () => {
      const { uc } = makeUseCase({
        reposOverride: { existeEmail: vi.fn().mockResolvedValue(true) },
      });
      const result = await uc.execute({
        email: 'admin@zahavi.co',
        nombreCompleto: 'Ana García',
        rol: 'ADMIN',
        tipoCredencial: 'navegador',
        contrasenaEnClaro: 'Secr3t@PaSSword!',
        actorId: null,
        actorRol: null,
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('IDENTITY_EMAIL_YA_REGISTRADO');
    });

    it('rechaza contraseña débil según política', async () => {
      const { uc } = makeUseCase({
        contrasenaOverride: {
          validarPolitica: vi.fn().mockReturnValue(err(new ContrasenaDebilError('muy corta'))),
        },
      });
      const result = await uc.execute({
        email: 'admin@zahavi.co',
        nombreCompleto: 'Ana García',
        rol: 'ADMIN',
        tipoCredencial: 'navegador',
        contrasenaEnClaro: 'debil',
        actorId: null,
        actorRol: null,
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('IDENTITY_CONTRASENA_DEBIL');
    });

    it('no crea SUPERADMIN si actor no es SUPERADMIN', async () => {
      const { uc } = makeUseCase();
      const result = await uc.execute({
        email: 'super@zahavi.co',
        nombreCompleto: 'Nuevo Super',
        rol: 'SUPERADMIN',
        tipoCredencial: 'navegador',
        contrasenaEnClaro: 'Secr3t@PaSSword!',
        actorId: '44444444-4444-4444-4444-444444444444',
        actorRol: 'ADMIN',
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('IDENTITY_ROL_NO_AUTORIZADO_CREAR');
    });
  });

  describe('flujo tablet (WORKER)', () => {
    it('happy path: crea usuario con PIN', async () => {
      const { uc, repos } = makeUseCase();
      const result = await uc.execute({
        email: 'worker@zahavi.co',
        nombreCompleto: 'Carlos Obrero',
        rol: 'WORKER',
        tipoCredencial: 'tablet',
        pinEnClaro: '123456',
        actorId: '44444444-4444-4444-4444-444444444444',
        actorRol: 'ADMIN',
      });
      expect(result.ok).toBe(true);
      expect(repos.guardar).toHaveBeenCalledOnce();
    });

    it('rechaza PIN con formato inválido según el verificador', async () => {
      const { uc } = makeUseCase({
        pinOverride: {
          validarFormato: vi
            .fn()
            .mockReturnValue(err(new (await import('@zahavi/domain-identity')).PinInvalidoError())),
        },
      });
      const result = await uc.execute({
        email: 'worker@zahavi.co',
        nombreCompleto: 'Carlos Obrero',
        rol: 'WORKER',
        tipoCredencial: 'tablet',
        pinEnClaro: 'abc',
        actorId: null,
        actorRol: null,
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('IDENTITY_PIN_INVALIDO');
    });
  });
});
