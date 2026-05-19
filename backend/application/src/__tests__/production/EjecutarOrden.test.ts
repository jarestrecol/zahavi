import { describe, it, expect } from 'vitest';
import { EjecutarOrden } from '../../production/EjecutarOrden.js';
import {
  makeMockOrdenRepo,
  makeOrdenEnEjecucion,
  makeOrdenPlanificada,
  UUID_ORDEN,
  UUID_USUARIO,
  UUID_CORRELACION,
} from './helpers.js';

const mockDescontador = {
  descontarConsumoDeProduccion: async () => Promise.resolve(),
};

function makeUseCase(orden = makeOrdenEnEjecucion()) {
  const repo = makeMockOrdenRepo(orden);
  return { uc: new EjecutarOrden(repo, mockDescontador), repo };
}

const entradaBase = {
  ordenId: UUID_ORDEN,
  cantidadProducida: 10,
  codigoLote: 'LOTE-20260514-0001',
  ejecutadaPor: UUID_USUARIO,
};

describe('EjecutarOrden', () => {
  it('pasa a EJECUTADA y devuelve consumoReal', async () => {
    const { uc, repo } = makeUseCase();
    const result = await uc.execute(entradaBase, UUID_CORRELACION);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.codigoLote).toBe('LOTE-20260514-0001');
    expect(result.value.consumoReal.length).toBeGreaterThan(0);
    expect(repo.update).toHaveBeenCalledOnce();
  });

  it('rechaza si la orden no existe', async () => {
    const uc = new EjecutarOrden(makeMockOrdenRepo(null), mockDescontador);
    const result = await uc.execute(entradaBase, UUID_CORRELACION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PRODUCTION_ORDEN_NO_ENCONTRADA');
  });

  it('rechaza si la orden no está EN_EJECUCION', async () => {
    const { uc } = makeUseCase(makeOrdenPlanificada());
    const result = await uc.execute(entradaBase, UUID_CORRELACION);
    expect(result.ok).toBe(false);
  });

  it('rechaza cantidadProducida > cantidadAProducir (10)', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, cantidadProducida: 11 }, UUID_CORRELACION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PRODUCTION_CANTIDAD_PRODUCIDA_INVALIDA');
  });

  it('rechaza código de lote inválido', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, codigoLote: '' }, UUID_CORRELACION);
    expect(result.ok).toBe(false);
  });
});
