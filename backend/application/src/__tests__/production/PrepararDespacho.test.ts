import { describe, it, expect } from 'vitest';
import { PrepararDespacho } from '../../production/PrepararDespacho.js';
import {
  makeMockOrdenRepo,
  makeMockDespachoRepo,
  makeOrdenEjecutada,
  makeOrdenEnEjecucion,
  UUID_ORDEN,
  UUID_PUNTO,
  UUID_USUARIO,
  UUID_CORRELACION,
} from './helpers.js';

function makeUseCase(orden = makeOrdenEjecutada()) {
  const ordeRepo = makeMockOrdenRepo(orden);
  const despachoRepo = makeMockDespachoRepo();
  return { uc: new PrepararDespacho(ordeRepo, despachoRepo), ordeRepo, despachoRepo };
}

const entradaBase = {
  ordenId: UUID_ORDEN,
  cantidadDespachada: 8,
  puntoDeVentaDestinoId: UUID_PUNTO,
  preparadoPor: UUID_USUARIO,
};

describe('PrepararDespacho', () => {
  it('prepara despacho desde orden EJECUTADA', async () => {
    const { uc, despachoRepo } = makeUseCase();
    const result = await uc.execute(entradaBase, UUID_CORRELACION);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.estado).toBe('PREPARADO');
    expect(result.value.despachoId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(despachoRepo.save).toHaveBeenCalledOnce();
  });

  it('rechaza si la orden no existe', async () => {
    const uc = new PrepararDespacho(makeMockOrdenRepo(null), makeMockDespachoRepo());
    const result = await uc.execute(entradaBase, UUID_CORRELACION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PRODUCTION_ORDEN_NO_ENCONTRADA');
  });

  it('rechaza si la orden no está EJECUTADA', async () => {
    const { uc } = makeUseCase(makeOrdenEnEjecucion());
    const result = await uc.execute(entradaBase, UUID_CORRELACION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PRODUCTION_ORDEN_NO_EJECUTADA');
  });

  it('rechaza IDs inválidos', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute(
      { ...entradaBase, puntoDeVentaDestinoId: 'no-uuid' },
      UUID_CORRELACION,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PRODUCTION_ID_INVALIDO');
  });
});
