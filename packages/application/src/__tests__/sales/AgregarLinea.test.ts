import { describe, it, expect } from 'vitest';
import { AgregarLineaAComanda } from '../../sales/AgregarLineaAComanda.js';
import {
  makeMockComandaRepo,
  makeMockConsultorProducto,
  makeComandaAbierta,
  makeComandaLista,
  UUID_CORRELACION,
  UUID_VARIANTE,
} from './helpers.js';

const entradaBase = {
  comandaId: '22222222-2222-2222-2222-222222222222',
  varianteId: UUID_VARIANTE,
  cantidad: 2,
};

function makeUseCase(comanda = makeComandaAbierta(), datosProducto = null) {
  const repoComandas = makeMockComandaRepo(comanda);
  const consultor = makeMockConsultorProducto(datosProducto ?? undefined);
  return { uc: new AgregarLineaAComanda(repoComandas, consultor), repoComandas };
}

describe('AgregarLineaAComanda', () => {
  it('agrega línea y devuelve subtotal y total', async () => {
    const { uc, repoComandas } = makeUseCase();
    const result = await uc.execute(entradaBase, UUID_CORRELACION);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.lineaId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(result.value.subtotalConIVA).toBe(9000); // 2 × 4500 (IVA 0%)
    expect(result.value.totalComandaConIVA).toBe(9000);
    expect(repoComandas.update).toHaveBeenCalledOnce();
  });

  it('rechaza si la comanda no existe', async () => {
    const repo = makeMockComandaRepo(null);
    const uc = new AgregarLineaAComanda(repo, makeMockConsultorProducto());
    const result = await uc.execute(entradaBase, UUID_CORRELACION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('SALES_COMANDA_NO_ENCONTRADA');
  });

  it('rechaza si el producto no existe en catálogo', async () => {
    const repo = makeMockComandaRepo(makeComandaAbierta());
    const uc = new AgregarLineaAComanda(repo, makeMockConsultorProducto(null));
    const result = await uc.execute(entradaBase, UUID_CORRELACION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('SALES_PRODUCTO_NO_ENCONTRADO');
  });

  it('rechaza si la comanda no está ABIERTA', async () => {
    const { uc } = makeUseCase(makeComandaLista());
    const result = await uc.execute(entradaBase, UUID_CORRELACION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('SALES_COMANDA_NO_MODIFICABLE');
  });

  it('rechaza cantidad = 0', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, cantidad: 0 }, UUID_CORRELACION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('SALES_CANTIDAD_LINEA_INVALIDA');
  });

  it('rechaza varianteId inválido', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, varianteId: 'no-uuid' }, UUID_CORRELACION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('SALES_ID_INVALIDO');
  });
});
