import { describe, it, expect } from 'vitest';
import { CrearCombo } from '../../catalog/CrearCombo.js';
import {
  makeMockComboRepo,
  makeMockPublicador,
  UUID_VARIANTE,
  UUID_CORRELACION,
} from './helpers.js';

const itemBase = {
  productoVarianteId: UUID_VARIANTE,
  cantidadValor: 1,
  unidad: 'unidad',
};

const entradaBase = {
  nombre: 'Combo Desayuno',
  descripcion: 'Pan con café',
  imagenUrl: null,
  precioCop: 8000,
  items: [itemBase],
  actorRol: 'ADMIN' as const,
  correlacionId: UUID_CORRELACION,
};

function makeUseCase(
  overrides: {
    comboOverride?: Parameters<typeof makeMockComboRepo>[0];
  } = {},
) {
  const comboRepo = makeMockComboRepo(overrides.comboOverride);
  const publicador = makeMockPublicador();
  const uc = new CrearCombo(comboRepo, publicador);
  return { uc, comboRepo, publicador };
}

describe('CrearCombo', () => {
  it('crea combo exitosamente con ADMIN', async () => {
    const { uc, comboRepo, publicador } = makeUseCase();
    const result = await uc.execute(entradaBase);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.comboId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(result.value.cantidadDeItems).toBe(1);
    expect(comboRepo.save).toHaveBeenCalledOnce();
    expect(publicador.publicar).toHaveBeenCalledOnce();
  });

  it('crea combo exitosamente con SUPERADMIN', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, actorRol: 'SUPERADMIN' });
    expect(result.ok).toBe(true);
  });

  it('falla con rol WORKER', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, actorRol: 'WORKER' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CATALOG_ROL_NO_AUTORIZADO');
  });

  it('publica evento ComboCreado', async () => {
    const { uc, publicador } = makeUseCase();
    await uc.execute(entradaBase);
    expect(publicador.publicar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'ComboCreado' }),
      UUID_CORRELACION,
    );
  });

  it('falla con nombre vacío', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, nombre: '' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CATALOG_NOMBRE_INVALIDO');
  });

  it('falla con lista de items vacía (ComboSinItemsError)', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, items: [] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CATALOG_COMBO_SIN_ITEMS');
  });

  it('falla con precio negativo', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ...entradaBase, precioCop: -500 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/negativo|inválido|invalido/i);
  });

  it('falla con productoVarianteId UUID inválido en item', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({
      ...entradaBase,
      items: [{ ...itemBase, productoVarianteId: 'no-es-uuid' }],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CATALOG_ID_INVALIDO');
  });
});
