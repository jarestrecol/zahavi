import { describe, it, expect } from 'vitest';
import { ListarMesas } from '../../sales/ListarMesas.js';
import {
  makeMockMesaRepo,
  makeMockComandaRepo,
  makeMesaLibre,
  UUID_CORRELACION,
  UUID_PUNTO,
} from './helpers.js';

const emptyComandaRepo = makeMockComandaRepo(null);

describe('ListarMesas', () => {
  it('lista mesas por punto de venta', async () => {
    const uc = new ListarMesas(makeMockMesaRepo(makeMesaLibre()), emptyComandaRepo);
    const result = await uc.execute({ puntoDeVentaId: UUID_PUNTO }, UUID_CORRELACION);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.mesas).toHaveLength(1);
    expect(result.value.mesas.at(0)?.estado).toBe('LIBRE');
    expect(result.value.mesas.at(0)?.nombre).toBe('Mesa 1');
  });

  it('lista vacía si no hay mesas', async () => {
    const uc = new ListarMesas(makeMockMesaRepo(null), emptyComandaRepo);
    const result = await uc.execute({ puntoDeVentaId: UUID_PUNTO }, UUID_CORRELACION);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.mesas).toHaveLength(0);
  });
});
