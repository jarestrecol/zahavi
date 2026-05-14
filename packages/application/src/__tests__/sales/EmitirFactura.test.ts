import { describe, it, expect } from 'vitest';
import { EmitirFactura } from '../../sales/EmitirFactura.js';
import {
  makeMockCobroRepo,
  makeMockComandaRepo,
  makeMockFacturaRepo,
  makeCobroPendiente,
  makeCobroProcesado,
  makeComandaLista,
  UUID_CORRELACION,
  UUID_PUNTO,
} from './helpers.js';

const ENTRADA = { cobroId: '33333333-3333-3333-3333-333333333333', puntoDeVentaId: UUID_PUNTO };

describe('EmitirFactura', () => {
  it('emite factura desde cobro PROCESADO', async () => {
    const uc = new EmitirFactura(
      makeMockCobroRepo(makeCobroProcesado()),
      makeMockComandaRepo(makeComandaLista()),
      makeMockFacturaRepo(),
    );
    const result = await uc.execute(ENTRADA, UUID_CORRELACION);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.facturaId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(result.value.numero).toBe('FAC-2026-00001');
    expect(result.value.total).toBeGreaterThan(0);
  });

  it('rechaza si el cobro no existe', async () => {
    const uc = new EmitirFactura(
      makeMockCobroRepo(null),
      makeMockComandaRepo(null),
      makeMockFacturaRepo(),
    );
    const result = await uc.execute(ENTRADA, UUID_CORRELACION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('SALES_COBRO_NO_ENCONTRADO');
  });

  it('rechaza si el cobro no está PROCESADO', async () => {
    const uc = new EmitirFactura(
      makeMockCobroRepo(makeCobroPendiente()),
      makeMockComandaRepo(makeComandaLista()),
      makeMockFacturaRepo(),
    );
    const result = await uc.execute(ENTRADA, UUID_CORRELACION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('SALES_COBRO_NO_PROCESADO');
  });
});
