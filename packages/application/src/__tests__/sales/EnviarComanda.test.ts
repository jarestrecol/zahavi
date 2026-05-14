import { describe, it, expect } from 'vitest';
import { EnviarComandaACocina } from '../../sales/EnviarComandaACocina.js';
import {
  makeMockComandaRepo,
  makeComandaAbierta,
  makeComandaConLinea,
  UUID_CORRELACION,
} from './helpers.js';

const ENTRADA = { comandaId: '22222222-2222-2222-2222-222222222222' };

describe('EnviarComandaACocina', () => {
  it('ABIERTA con líneas → ENVIADA', async () => {
    const uc = new EnviarComandaACocina(makeMockComandaRepo(makeComandaConLinea()));
    const result = await uc.execute(ENTRADA, UUID_CORRELACION);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.estado).toBe('ENVIADA');
  });

  it('rechaza comanda sin líneas', async () => {
    const uc = new EnviarComandaACocina(makeMockComandaRepo(makeComandaAbierta()));
    const result = await uc.execute(ENTRADA, UUID_CORRELACION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('SALES_COMANDA_SIN_LINEAS');
  });

  it('rechaza si la comanda no existe', async () => {
    const uc = new EnviarComandaACocina(makeMockComandaRepo(null));
    const result = await uc.execute(ENTRADA, UUID_CORRELACION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('SALES_COMANDA_NO_ENCONTRADA');
  });
});
