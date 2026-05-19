import { describe, it, expect } from 'vitest';
import { IniciarOrden } from '../../production/IniciarOrden.js';
import {
  makeMockOrdenRepo,
  makeOrdenReservada,
  makeOrdenPlanificada,
  UUID_ORDEN,
  UUID_USUARIO,
  UUID_CORRELACION,
} from './helpers.js';

function makeUseCase(orden = makeOrdenReservada()) {
  const repo = makeMockOrdenRepo(orden);
  return { uc: new IniciarOrden(repo), repo };
}

describe('IniciarOrden', () => {
  it('transiciona a EN_EJECUCION', async () => {
    const { uc, repo } = makeUseCase();
    const result = await uc.execute(
      { ordenId: UUID_ORDEN, iniciadaPor: UUID_USUARIO },
      UUID_CORRELACION,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.estado).toBe('EN_EJECUCION');
    expect(repo.update).toHaveBeenCalledOnce();
  });

  it('rechaza si la orden no existe', async () => {
    const uc = new IniciarOrden(makeMockOrdenRepo(null));
    const result = await uc.execute(
      { ordenId: UUID_ORDEN, iniciadaPor: UUID_USUARIO },
      UUID_CORRELACION,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PRODUCTION_ORDEN_NO_ENCONTRADA');
  });

  it('rechaza si la orden no está RESERVADA', async () => {
    const { uc } = makeUseCase(makeOrdenPlanificada());
    const result = await uc.execute(
      { ordenId: UUID_ORDEN, iniciadaPor: UUID_USUARIO },
      UUID_CORRELACION,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PRODUCTION_TRANSICION_DE_ESTADO_INVALIDA');
  });
});
