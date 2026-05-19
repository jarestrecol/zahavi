import { describe, it, expect } from 'vitest';
import { ConfigurarAlertaIngrediente } from '../../inventory/ConfigurarAlertaIngrediente.js';
import {
  makeMockIngredientRepo,
  makeMockPublicador,
  makeIngredient,
  UUID_ING,
  UUID_CORRELACION,
} from './helpers.js';

const entradaBase = {
  ingredienteId: UUID_ING,
  nuevoUmbral: 15,
  actorRol: 'ADMIN',
  correlacionId: UUID_CORRELACION,
};

function makeUseCase(opts: { ingredienteExiste?: boolean } = {}) {
  const ingrediente = makeIngredient({ umbral: 5 });
  const ingredientRepo = makeMockIngredientRepo({
    getById:
      opts.ingredienteExiste === false
        ? () => Promise.resolve(null)
        : () => Promise.resolve(ingrediente),
  });
  const publicador = makeMockPublicador();
  const uc = new ConfigurarAlertaIngrediente(ingredientRepo, publicador);
  return { uc, ingredientRepo, publicador };
}

describe('ConfigurarAlertaIngrediente', () => {
  it('actualiza el umbral correctamente', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute(entradaBase);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.umbralAnterior).toBe(5);
    expect(result.value.umbralNuevo).toBe(15);
  });

  it('actualiza el ingrediente en el repositorio', async () => {
    const { uc, ingredientRepo } = makeUseCase();
    await uc.execute(entradaBase);
    expect(ingredientRepo.update).toHaveBeenCalledOnce();
  });

  it('publica evento UmbralCambiado', async () => {
    const { uc, publicador } = makeUseCase();
    await uc.execute(entradaBase);
    expect(publicador.publicarLote).toHaveBeenCalledOnce();
  });

  it('acepta umbral cero (deshabilita alertas)', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, nuevoUmbral: 0 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.umbralNuevo).toBe(0);
  });

  it('falla con WORKER', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, actorRol: 'WORKER' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVENTORY_ROL_NO_AUTORIZADO');
  });

  it('falla si el ingrediente no existe', async () => {
    const { uc } = makeUseCase({ ingredienteExiste: false });
    const result = await uc.execute(entradaBase);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVENTORY_INGREDIENTE_NO_ENCONTRADO');
  });

  it('falla con umbral negativo', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, nuevoUmbral: -1 });
    expect(result.ok).toBe(false);
  });
});
