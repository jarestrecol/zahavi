import { describe, it, expect } from 'vitest';
import { ProcesarCobro } from '../../sales/ProcesarCobro.js';
import {
  makeMockComandaRepo,
  makeMockCobroRepo,
  makeMockMesaRepo,
  makeComandaLista,
  makeComandaConLinea,
  makeMesaOcupada,
  UUID_CORRELACION,
  UUID_PUNTO,
  UUID_USUARIO,
} from './helpers.js';

const entradaBase = {
  comandaId: '22222222-2222-2222-2222-222222222222',
  puntoDeVentaId: UUID_PUNTO,
  cobradoPor: UUID_USUARIO,
  pagos: [{ metodo: 'EFECTIVO', monto: 9000 }],
};

function makeUseCase(comanda = makeComandaLista(), mesa = makeMesaOcupada()) {
  return new ProcesarCobro(
    makeMockComandaRepo(comanda),
    makeMockCobroRepo(),
    makeMockMesaRepo(mesa),
  );
}

describe('ProcesarCobro', () => {
  it('procesa cobro y devuelve cambio = 0', async () => {
    const result = await makeUseCase().execute(entradaBase, UUID_CORRELACION);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.cobroId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(result.value.totalCobrado).toBe(9000);
    expect(result.value.cambio).toBe(0);
  });

  it('calcula cambio cuando se paga de más', async () => {
    const result = await makeUseCase().execute(
      { ...entradaBase, pagos: [{ metodo: 'EFECTIVO', monto: 10000 }] },
      UUID_CORRELACION,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.cambio).toBe(1000);
  });

  it('rechaza si la comanda no existe', async () => {
    const uc = new ProcesarCobro(
      makeMockComandaRepo(null),
      makeMockCobroRepo(),
      makeMockMesaRepo(null),
    );
    const result = await uc.execute(entradaBase, UUID_CORRELACION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('SALES_COMANDA_NO_ENCONTRADA');
  });

  it('rechaza si la comanda no está LISTA', async () => {
    const result = await makeUseCase(makeComandaConLinea()).execute(entradaBase, UUID_CORRELACION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('SALES_COMANDA_NO_LISTA');
  });

  it('rechaza pago insuficiente', async () => {
    const result = await makeUseCase().execute(
      { ...entradaBase, pagos: [{ metodo: 'EFECTIVO', monto: 1000 }] },
      UUID_CORRELACION,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('SALES_COBRO_INCOMPLETO');
  });

  it('rechaza método de pago inválido', async () => {
    const result = await makeUseCase().execute(
      { ...entradaBase, pagos: [{ metodo: 'BITCOIN', monto: 9000 }] },
      UUID_CORRELACION,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('SALES_METODO_DE_PAGO_INVALIDO');
  });
});
