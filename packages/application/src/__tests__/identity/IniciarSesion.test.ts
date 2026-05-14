import { describe, it, expect, vi } from 'vitest';
import { IniciarSesion } from '../../identity/IniciarSesion.js';
import {
  makeMockReposUsuarios,
  makeMockReposSesiones,
  makeMockReposDispositivos,
  makeMockReposUnidades,
  makeMockVerifContrasena,
  makeMockVerifPin,
  makeMockVerifTotp,
  makeMockReloj,
  makeMockIds,
  makeMockPolitica,
  makeMockEventos,
  crearUsuarioNavegador,
  crearUsuarioTablet,
  UUID_USUARIO,
  UUID_SESION,
  UUID_DISPOSITIVO,
  UUID_BUSINESS_UNIT,
  HASH_PIN_VALIDO,
} from './helpers.js';

function makeUseCase(
  overrides: {
    usuario?: ReturnType<typeof crearUsuarioNavegador> | null;
    dispositivoActivo?: boolean;
    passwordOk?: boolean;
    pinOk?: boolean;
    totpOk?: boolean;
    conteoSesiones?: number;
    unidades?: string[];
  } = {},
) {
  const usuario = overrides.usuario !== undefined ? overrides.usuario : crearUsuarioNavegador();
  const repos = makeMockReposUsuarios({
    obtenerPorEmail: vi.fn().mockResolvedValue(usuario),
  });
  const reposSesiones = makeMockReposSesiones({
    contarActivasDeUsuario: vi.fn().mockResolvedValue(overrides.conteoSesiones ?? 0),
  });
  const reposDispositivos = makeMockReposDispositivos({
    estaActivo: vi.fn().mockResolvedValue(overrides.dispositivoActivo ?? true),
  });
  const verifContrasena = makeMockVerifContrasena({
    verificar: vi.fn().mockResolvedValue(overrides.passwordOk ?? true),
  });
  const verifPin = makeMockVerifPin({
    verificar: vi.fn().mockResolvedValue(overrides.pinOk ?? true),
    hashear: vi.fn().mockResolvedValue(HASH_PIN_VALIDO),
  });
  const verifTotp = makeMockVerifTotp({
    verificar: vi.fn().mockResolvedValue(overrides.totpOk ?? true),
  });
  const reloj = makeMockReloj();
  const ids = makeMockIds();
  const politica = makeMockPolitica();
  const eventos = makeMockEventos();
  const reposUnidades = makeMockReposUnidades({
    listarIdsPorUsuario: vi.fn().mockResolvedValue(overrides.unidades ?? [UUID_BUSINESS_UNIT]),
  });
  const uc = new IniciarSesion(
    repos,
    reposSesiones,
    reposDispositivos,
    verifContrasena,
    verifPin,
    verifTotp,
    reloj,
    ids,
    politica,
    eventos,
    reposUnidades,
  );
  return { uc, repos, reposSesiones, verifContrasena, verifPin, verifTotp, eventos, reposUnidades };
}

const ENTRADA_NAVEGADOR = {
  tipo: 'navegador' as const,
  email: 'test@zahavi.co',
  contrasenaEnClaro: 'MiContraseña123!',
  codigoTotp: '123456',
};

const ENTRADA_TABLET = {
  tipo: 'tablet' as const,
  email: 'worker@zahavi.co',
  dispositivoId: UUID_DISPOSITIVO,
  pinEnClaro: '654321',
};

describe('IniciarSesion', () => {
  describe('flujo navegador', () => {
    it('happy path: abre sesión y retorna datos para JWT', async () => {
      const { uc, reposSesiones, eventos } = makeUseCase();
      const result = await uc.execute(ENTRADA_NAVEGADOR);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.sesionId).toBe(UUID_SESION);
      expect(result.value.usuarioId).toBe(UUID_USUARIO);
      expect(result.value.rol).toBe('ADMIN');
      expect(result.value.dispositivoId).toBeNull();
      expect(result.value.expiraEnAbsolutoMs).toBeGreaterThan(0);

      expect(reposSesiones.guardar).toHaveBeenCalledOnce();
      expect(eventos.publicar).toHaveBeenCalledOnce();
    });

    it('retorna CredencialesInvalidasError cuando el usuario no existe', async () => {
      const { uc, verifContrasena } = makeUseCase({ usuario: null });
      const result = await uc.execute(ENTRADA_NAVEGADOR);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('IDENTITY_CREDENCIALES_INVALIDAS');
      // CRIT-2: aún así debe llamar a verificar (tiempo constante)
      expect(verifContrasena.verificar).toHaveBeenCalledOnce();
    });

    it('retorna CredencialesInvalidasError cuando la contraseña es incorrecta', async () => {
      const { uc } = makeUseCase({ passwordOk: false });
      const result = await uc.execute(ENTRADA_NAVEGADOR);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('IDENTITY_CREDENCIALES_INVALIDAS');
    });

    it('retorna UsuarioNoActivoError cuando el usuario está deshabilitado', async () => {
      const { uc } = makeUseCase({
        usuario: crearUsuarioNavegador({ estado: 'deshabilitado' }),
      });
      const result = await uc.execute(ENTRADA_NAVEGADOR);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('IDENTITY_USUARIO_NO_ACTIVO');
    });

    it('happy path ADMIN sin TOTP: inicia sesión solo con contraseña', async () => {
      // ADMIN sin TOTP enrolado puede iniciar sesión sin código TOTP
      const { uc, reposSesiones } = makeUseCase({
        usuario: crearUsuarioNavegador({ rol: 'ADMIN', totpVerificado: false, secretoTotp: null }),
      });
      const result = await uc.execute({
        tipo: 'navegador',
        email: 'test@zahavi.co',
        contrasenaEnClaro: 'MiContraseña123!',
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.rol).toBe('ADMIN');
      expect(reposSesiones.guardar).toHaveBeenCalledOnce();
    });

    it('retorna TotpNoVerificadoError cuando SUPERADMIN no tiene TOTP enrolado', async () => {
      const { uc } = makeUseCase({
        usuario: crearUsuarioNavegador({
          rol: 'SUPERADMIN',
          totpVerificado: false,
          secretoTotp: null,
        }),
      });
      const result = await uc.execute({
        tipo: 'navegador',
        email: 'test@zahavi.co',
        contrasenaEnClaro: 'MiContraseña123!',
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('IDENTITY_TOTP_NO_VERIFICADO');
    });

    it('retorna TotpNoVerificadoError cuando TOTP está enrolado pero no verificado', async () => {
      const { uc } = makeUseCase({
        usuario: crearUsuarioNavegador({ totpVerificado: false }),
      });
      const result = await uc.execute(ENTRADA_NAVEGADOR);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('IDENTITY_TOTP_NO_VERIFICADO');
    });

    it('retorna CredencialesInvalidasError cuando tiene TOTP enrolado pero no envía código', async () => {
      const { uc } = makeUseCase(); // TOTP enrolado y verificado por defecto
      const result = await uc.execute({
        tipo: 'navegador',
        email: 'test@zahavi.co',
        contrasenaEnClaro: 'MiContraseña123!',
        // codigoTotp omitido — debe fallar porque el usuario tiene TOTP enrolado
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('IDENTITY_CREDENCIALES_INVALIDAS');
    });

    it('retorna CredencialesInvalidasError cuando el código TOTP es inválido', async () => {
      const { uc } = makeUseCase({ totpOk: false });
      const result = await uc.execute(ENTRADA_NAVEGADOR);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('IDENTITY_CREDENCIALES_INVALIDAS');
    });

    it('retorna LimiteDeSesionesAlcanzadoError cuando se supera el límite', async () => {
      const { uc } = makeUseCase({ conteoSesiones: 10 });
      const result = await uc.execute(ENTRADA_NAVEGADOR);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('IDENTITY_LIMITE_SESIONES');
    });

    it('anti-timing: verifica contraseña incluso cuando usuario tiene tipo tablet (credencial incorrecta)', async () => {
      // Un usuario tablet intenta loguearse como navegador → el verificador siempre corre
      const { uc, verifContrasena } = makeUseCase({ usuario: crearUsuarioTablet() });
      const result = await uc.execute(ENTRADA_NAVEGADOR);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('IDENTITY_CREDENCIALES_INVALIDAS');
      expect(verifContrasena.verificar).toHaveBeenCalledOnce();
    });
  });

  describe('flujo tablet', () => {
    it('happy path: abre sesión de WORKER con dispositivo', async () => {
      const uc2 = new IniciarSesion(
        makeMockReposUsuarios({ obtenerPorEmail: vi.fn().mockResolvedValue(crearUsuarioTablet()) }),
        makeMockReposSesiones({ contarActivasDeUsuario: vi.fn().mockResolvedValue(0) }),
        makeMockReposDispositivos({ estaActivo: vi.fn().mockResolvedValue(true) }),
        makeMockVerifContrasena(),
        makeMockVerifPin({ verificar: vi.fn().mockResolvedValue(true) }),
        makeMockVerifTotp(),
        makeMockReloj(),
        makeMockIds(),
        makeMockPolitica(),
        makeMockEventos(),
        makeMockReposUnidades(),
      );
      const result = await uc2.execute(ENTRADA_TABLET);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.rol).toBe('WORKER');
      expect(result.value.dispositivoId).toBe(UUID_DISPOSITIVO);
    });

    it('retorna DispositivoNoAutorizadoError cuando el dispositivo no está activo', async () => {
      const uc2 = new IniciarSesion(
        makeMockReposUsuarios({ obtenerPorEmail: vi.fn().mockResolvedValue(crearUsuarioTablet()) }),
        makeMockReposSesiones(),
        makeMockReposDispositivos({ estaActivo: vi.fn().mockResolvedValue(false) }),
        makeMockVerifContrasena(),
        makeMockVerifPin(),
        makeMockVerifTotp(),
        makeMockReloj(),
        makeMockIds(),
        makeMockPolitica(),
        makeMockEventos(),
        makeMockReposUnidades(),
      );
      const result = await uc2.execute(ENTRADA_TABLET);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('IDENTITY_DISPOSITIVO_NO_AUTORIZADO');
    });

    it('anti-timing: verifica PIN incluso cuando el usuario no existe', async () => {
      const verifPin = makeMockVerifPin({ verificar: vi.fn().mockResolvedValue(false) });
      const uc2 = new IniciarSesion(
        makeMockReposUsuarios({ obtenerPorEmail: vi.fn().mockResolvedValue(null) }),
        makeMockReposSesiones(),
        makeMockReposDispositivos({ estaActivo: vi.fn().mockResolvedValue(true) }),
        makeMockVerifContrasena(),
        verifPin,
        makeMockVerifTotp(),
        makeMockReloj(),
        makeMockIds(),
        makeMockPolitica(),
        makeMockEventos(),
        makeMockReposUnidades(),
      );
      const result = await uc2.execute(ENTRADA_TABLET);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('IDENTITY_CREDENCIALES_INVALIDAS');
      // CRIT-2: verificar PIN siempre debe haberse ejecutado
      expect(verifPin.verificar).toHaveBeenCalledOnce();
    });
  });
});
