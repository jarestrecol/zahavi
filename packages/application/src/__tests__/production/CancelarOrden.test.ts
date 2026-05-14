import { describe, it, expect } from 'vitest';
import { CancelarOrden } from '../../production/CancelarOrden.js';
import {
  makeMockOrdenRepo,
  makeOrdenPlanificada,
  makeOrdenReservada,
  makeOrdenEnEjecucion,
  UUID_ORDEN,
  UUID_USUARIO,
  UUID_CORRELACION,
} from './helpers.js';

function makeUseCase(orden = makeOrdenPlanificada()) {
  const repo = makeMockOrdenRepo(orden);
  return { uc: new CancelarOrden(repo), repo };
}

const entradaBase = {
  ordenId: UUID_ORDEN,
  motivo: 'Error en la planificación',
  canceladaPor: UUID_USUARIO,
};

describe('CancelarOrden', () => {
  it('cancela desde PLANIFICADA', async () => {
    const { uc, repo } = makeUseCase();
    const result = await uc.execute(entradaBase, UUID_CORRELACION);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.estado).toBe('CANCELADA');
    expect(repo.update).toHaveBeenCalledOnce();
  });

  it('cancela desde RESERVADA', async () => {
    const { uc } = makeUseCase(makeOrdenReservada());
    const result = await uc.execute(entradaBase, UUID_CORRELACION);
    expect(result.ok).toBe(true);
  });

  it('rechaza si la orden no existe', async () => {
    const uc = new CancelarOrden(makeMockOrdenRepo(null));
    const result = await uc.execute(entradaBase, UUID_CORRELACION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PRODUCTION_ORDEN_NO_ENCONTRADA');
  });

  it('rechaza cancelar en EN_EJECUCION', async () => {
    const { uc } = makeUseCase(makeOrdenEnEjecucion());
    const result = await uc.execute(entradaBase, UUID_CORRELACION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PRODUCTION_ORDEN_NO_CANCELABLE');
  });

  it('rechaza motivo vacío', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, motivo: '' }, UUID_CORRELACION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PRODUCTION_CANCELACION_SIN_JUSTIFICACION');
  });
});
