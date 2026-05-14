import { describe, it, expect } from 'vitest';
import { RegistrarMermaEnOrden } from '../../production/RegistrarMermaEnOrden.js';
import {
  makeMockOrdenRepo,
  makeOrdenEnEjecucion,
  makeOrdenPlanificada,
  UUID_ORDEN,
  UUID_ING_A,
  UUID_USUARIO,
  UUID_CORRELACION,
} from './helpers.js';

function makeUseCase(orden = makeOrdenEnEjecucion()) {
  const repo = makeMockOrdenRepo(orden);
  return { uc: new RegistrarMermaEnOrden(repo), repo };
}

const entradaBase = {
  ordenId: UUID_ORDEN,
  ingredientId: UUID_ING_A,
  cantidad: 1,
  unidad: 'kg',
  motivo: 'Derrame accidental',
  registradaPor: UUID_USUARIO,
};

describe('RegistrarMermaEnOrden', () => {
  it('registra merma válida y actualiza la orden', async () => {
    const { uc, repo } = makeUseCase();
    const result = await uc.execute(entradaBase, UUID_CORRELACION);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.mermaId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(repo.update).toHaveBeenCalledOnce();
  });

  it('rechaza si la orden no existe', async () => {
    const uc = new RegistrarMermaEnOrden(makeMockOrdenRepo(null));
    const result = await uc.execute(entradaBase, UUID_CORRELACION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PRODUCTION_ORDEN_NO_ENCONTRADA');
  });

  it('rechaza si la orden no está EN_EJECUCION', async () => {
    const { uc } = makeUseCase(makeOrdenPlanificada());
    const result = await uc.execute(entradaBase, UUID_CORRELACION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PRODUCTION_MERMA_FUERA_DE_EJECUCION');
  });

  it('rechaza unidad inválida', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, unidad: 'tonelada' }, UUID_CORRELACION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PRODUCTION_UNIDAD_INVALIDA');
  });

  it('rechaza merma mayor que el BOM del ingrediente (5 kg)', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, cantidad: 6 }, UUID_CORRELACION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PRODUCTION_MERMA_EXCEDE_CONSUMO');
  });
});
