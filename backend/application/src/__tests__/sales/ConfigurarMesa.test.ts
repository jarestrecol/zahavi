import { describe, it, expect } from 'vitest';
import { ConfigurarMesa } from '../../sales/ConfigurarMesa.js';
import { makeMockMesaRepo, UUID_CORRELACION } from './helpers.js';

describe('ConfigurarMesa', () => {
  it('crea mesa NORMAL y persiste', async () => {
    const repo = makeMockMesaRepo();
    const uc = new ConfigurarMesa(repo);
    const result = await uc.execute(
      { nombre: 'Mesa 5', puntoDeVentaId: 'dddddddd-dddd-dddd-dddd-dddddddddddd' },
      UUID_CORRELACION,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.mesaId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(repo.save).toHaveBeenCalledOnce();
  });

  it('rechaza nombre vacío', async () => {
    const uc = new ConfigurarMesa(makeMockMesaRepo());
    const result = await uc.execute(
      { nombre: '  ', puntoDeVentaId: 'dddddddd-dddd-dddd-dddd-dddddddddddd' },
      UUID_CORRELACION,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('SALES_NOMBRE_MESA_INVALIDO');
  });

  it('rechaza puntoDeVentaId inválido', async () => {
    const uc = new ConfigurarMesa(makeMockMesaRepo());
    const result = await uc.execute(
      { nombre: 'Mesa 1', puntoDeVentaId: 'no-es-uuid' },
      UUID_CORRELACION,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('SALES_ID_INVALIDO');
  });
});
