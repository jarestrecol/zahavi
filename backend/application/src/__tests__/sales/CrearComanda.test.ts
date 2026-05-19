import { describe, it, expect } from 'vitest';
import { CrearComanda } from '../../sales/CrearComanda.js';
import {
  makeMockMesaRepo,
  makeMockComandaRepo,
  makeMesaLibre,
  makeMesaOcupada,
  UUID_CORRELACION,
  UUID_PUNTO,
  UUID_USUARIO,
} from './helpers.js';

function makeUseCase(mesa = makeMesaLibre()) {
  const repoMesas = makeMockMesaRepo(mesa);
  const repoComanadas = makeMockComandaRepo();
  return { uc: new CrearComanda(repoMesas, repoComanadas), repoMesas, repoComanadas };
}

const entradaBase = {
  mesaId: '11111111-1111-1111-1111-111111111111',
  puntoDeVentaId: UUID_PUNTO,
  tomadaPor: UUID_USUARIO,
};

describe('CrearComanda', () => {
  it('crea comanda y ocupa la mesa', async () => {
    const { uc, repoMesas, repoComanadas } = makeUseCase();
    const result = await uc.execute(entradaBase, UUID_CORRELACION);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.comandaId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(repoMesas.update).toHaveBeenCalledOnce();
    expect(repoComanadas.save).toHaveBeenCalledOnce();
  });

  it('rechaza si la mesa no existe', async () => {
    const repoMesas = makeMockMesaRepo(null);
    const repoComanadas = makeMockComandaRepo();
    const ucNull = new CrearComanda(repoMesas, repoComanadas);
    const result = await ucNull.execute(entradaBase, UUID_CORRELACION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('SALES_MESA_NO_ENCONTRADA');
  });

  it('rechaza si la mesa ya está OCUPADA', async () => {
    const { uc } = makeUseCase(makeMesaOcupada());
    const result = await uc.execute(entradaBase, UUID_CORRELACION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('SALES_MESA_YA_OCUPADA');
  });

  it('rechaza IDs inválidos', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, mesaId: 'no-uuid' }, UUID_CORRELACION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('SALES_ID_INVALIDO');
  });
});
