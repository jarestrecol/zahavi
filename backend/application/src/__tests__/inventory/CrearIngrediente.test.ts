import { describe, it, expect } from 'vitest';
import { CrearIngrediente } from '../../inventory/CrearIngrediente.js';
import { makeMockIngredientRepo, makeMockPublicador, UUID_CORRELACION } from './helpers.js';

const entradaBase = {
  nombre: 'Azúcar blanca',
  unidadNativa: 'kg',
  costoUnitarioCop: 2_800,
  umbralDeAlerta: 10,
  actorRol: 'ADMIN',
  correlacionId: UUID_CORRELACION,
};

function makeUseCase() {
  const ingredientRepo = makeMockIngredientRepo();
  const publicador = makeMockPublicador();
  const uc = new CrearIngrediente(ingredientRepo, publicador);
  return { uc, ingredientRepo, publicador };
}

describe('CrearIngrediente', () => {
  it('crea ingrediente con datos válidos', async () => {
    const { uc, ingredientRepo } = makeUseCase();
    const result = await uc.execute(entradaBase);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.ingredienteId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(ingredientRepo.save).toHaveBeenCalledOnce();
  });

  it('publica evento IngredienteCreado', async () => {
    const { uc, publicador } = makeUseCase();
    await uc.execute(entradaBase);
    expect(publicador.publicarLote).toHaveBeenCalledOnce();
  });

  it('acepta umbral cero (sin alerta)', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, umbralDeAlerta: 0 });
    expect(result.ok).toBe(true);
  });

  it('acepta costo cero', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, costoUnitarioCop: 0 });
    expect(result.ok).toBe(true);
  });

  it('falla con WORKER', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, actorRol: 'WORKER' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVENTORY_ROL_NO_AUTORIZADO');
  });

  it('falla con nombre vacío', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, nombre: '' });
    expect(result.ok).toBe(false);
  });

  it('falla con unidad no reconocida', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, unidadNativa: 'tonelada' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVENTORY_UNIDAD_INVALIDA');
  });

  it('falla con costo negativo', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, costoUnitarioCop: -100 });
    expect(result.ok).toBe(false);
  });
});
