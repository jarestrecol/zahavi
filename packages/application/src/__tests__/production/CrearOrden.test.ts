import { describe, it, expect } from 'vitest';
import { CrearOrdenDeProduccion } from '../../production/CrearOrdenDeProduccion.js';
import {
  makeMockOrdenRepo,
  UUID_VARIANTE,
  UUID_RECETA,
  UUID_PLANTA,
  UUID_USUARIO,
  UUID_CORRELACION,
} from './helpers.js';

const entradaBase = {
  varianteId: UUID_VARIANTE,
  recetaId: UUID_RECETA,
  plantaCentralId: UUID_PLANTA,
  cantidadAProducir: 10,
  creadaPor: UUID_USUARIO,
};

function makeUseCase() {
  const repo = makeMockOrdenRepo(null);
  return { uc: new CrearOrdenDeProduccion(repo), repo };
}

describe('CrearOrdenDeProduccion', () => {
  it('crea orden y persiste', async () => {
    const { uc, repo } = makeUseCase();
    const result = await uc.execute(entradaBase, UUID_CORRELACION);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.ordenId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(repo.save).toHaveBeenCalledOnce();
  });

  it('rechaza cantidadAProducir = 0', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, cantidadAProducir: 0 }, UUID_CORRELACION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PRODUCTION_CANTIDAD_A_PRODUCIR_INVALIDA');
  });

  it('rechaza cantidadAProducir negativa', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, cantidadAProducir: -5 }, UUID_CORRELACION);
    expect(result.ok).toBe(false);
  });

  it('rechaza IDs de variante inválidos', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, varianteId: 'no-es-uuid' }, UUID_CORRELACION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PRODUCTION_ID_INVALIDO');
  });
});
