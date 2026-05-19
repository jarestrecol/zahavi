import { describe, it, expect } from 'vitest';
import { CambiarContextoBusinessUnit } from '../../identity/CambiarContextoBusinessUnit.js';
import {
  makeMockReposUsuarios,
  makeMockReposUnidades,
  crearUsuarioNavegador,
  UUID_USUARIO,
  UUID_BUSINESS_UNIT,
} from './helpers.js';

function makeUseCase(
  overrides: {
    usuarioRol?: 'SUPERADMIN' | 'ADMIN' | 'WORKER';
    usuarioEstado?: 'activo' | 'deshabilitado';
    usuarioEncontrado?: boolean;
    perteneceAlUsuario?: boolean;
  } = {},
) {
  const usuarioBase = crearUsuarioNavegador({
    rol: overrides.usuarioRol ?? 'ADMIN',
    estado: overrides.usuarioEstado ?? 'activo',
  });
  const usuario = overrides.usuarioEncontrado === false ? null : usuarioBase;

  const reposUsuarios = makeMockReposUsuarios({
    obtenerPorId: async () => usuario,
  });
  const reposUnidades = makeMockReposUnidades({
    perteneceAlUsuario: async () => overrides.perteneceAlUsuario ?? true,
  });

  return new CambiarContextoBusinessUnit(reposUsuarios, reposUnidades);
}

const ENTRADA_VALIDA = {
  usuarioId: UUID_USUARIO,
  nuevoBusinessUnitId: UUID_BUSINESS_UNIT,
};

describe('CambiarContextoBusinessUnit', () => {
  it('devuelve el businessUnitId confirmado cuando ADMIN tiene acceso', async () => {
    const uc = makeUseCase({ usuarioRol: 'ADMIN', perteneceAlUsuario: true });
    const result = await uc.execute(ENTRADA_VALIDA);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.businessUnitId).toBe(UUID_BUSINESS_UNIT);
  });

  it('devuelve el businessUnitId confirmado cuando SUPERADMIN tiene acceso', async () => {
    const uc = makeUseCase({ usuarioRol: 'SUPERADMIN', perteneceAlUsuario: true });
    const result = await uc.execute(ENTRADA_VALIDA);
    expect(result.ok).toBe(true);
  });

  it('bloquea a WORKER — siempre tiene una sola unidad asignada y no puede cambiar contexto', async () => {
    const uc = makeUseCase({ usuarioRol: 'WORKER' });
    const result = await uc.execute(ENTRADA_VALIDA);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('IDENTITY_ACCESO_DENEGADO');
  });

  it('rechaza cuando el usuario no existe', async () => {
    const uc = makeUseCase({ usuarioEncontrado: false });
    const result = await uc.execute(ENTRADA_VALIDA);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('IDENTITY_CREDENCIALES_INVALIDAS');
  });

  it('rechaza cuando el usuario está deshabilitado', async () => {
    const uc = makeUseCase({ usuarioEstado: 'deshabilitado' });
    const result = await uc.execute(ENTRADA_VALIDA);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('IDENTITY_CREDENCIALES_INVALIDAS');
  });

  it('rechaza ADMIN que intenta acceder a unidad no asignada (IDOR cross-tenant)', async () => {
    const uc = makeUseCase({ usuarioRol: 'ADMIN', perteneceAlUsuario: false });
    const result = await uc.execute(ENTRADA_VALIDA);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('IDENTITY_ACCESO_DENEGADO');
  });

  it('rechaza SUPERADMIN que intenta acceder a unidad no asignada', async () => {
    const uc = makeUseCase({ usuarioRol: 'SUPERADMIN', perteneceAlUsuario: false });
    const result = await uc.execute(ENTRADA_VALIDA);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('IDENTITY_ACCESO_DENEGADO');
  });
});
