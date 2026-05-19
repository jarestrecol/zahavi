import { describe, it, expect } from 'vitest';
import { Combo } from '../../aggregates/Combo.js';
import { ComboItem } from '../../entities/ComboItem.js';
import { ComboId, ComboItemId, ProductVariantId } from '../../value-objects/ids.js';
import { NombreDeCatalogo } from '../../value-objects/NombreDeCatalogo.js';
import { Money } from '../../value-objects/Money.js';
import { Cantidad } from '../../value-objects/Cantidad.js';
import { FechaHora } from '../../value-objects/FechaHora.js';
import {
  ComboSinItemsError,
  ItemDeComboDuplicadoError,
  ItemDeComboNoEncontradoError,
  VarianteDuplicadaEnComboError,
  ComboYaEnEstadoError,
  VigenciaInvalidaError,
} from '../../errors/index.js';

const COMBO_ID = '11111111-1111-1111-1111-111111111111';
const ITEM_1 = '22222222-2222-2222-2222-222222222222';
const ITEM_2 = '33333333-3333-3333-3333-333333333333';
const VARIANT_1 = '44444444-4444-4444-4444-444444444444';
const VARIANT_2 = '55555555-5555-5555-5555-555555555555';
const EVT = '66666666-6666-6666-6666-666666666666';

// Ref temporal: 2023-11-15T00:00:00Z
const AHORA = FechaHora.deTimestamp(1_700_000_000_000);
const HACE_UN_DIA = FechaHora.deTimestamp(1_700_000_000_000 - 86_400_000);
const EN_UN_DIA = FechaHora.deTimestamp(1_700_000_000_000 + 86_400_000);

function unwrap<T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!r.ok) throw new Error(`Esperaba ok, recibí: ${JSON.stringify(r.error)}`);
  return r.value;
}

function nombre(s: string): NombreDeCatalogo {
  return unwrap(NombreDeCatalogo.of(s));
}

function money(v: number): Money {
  return unwrap(Money.deCop(v));
}

function item(itemId: string, variantId: string, n = 1): ComboItem {
  return ComboItem.crear({
    id: unwrap(ComboItemId.of(itemId)),
    productVariantId: unwrap(ProductVariantId.of(variantId)),
    cantidad: unwrap(Cantidad.de(n, 'unidad')),
  });
}

function crearCombo(
  items: ReadonlyArray<ComboItem>,
  vigenciaDesde: FechaHora | null = null,
  vigenciaHasta: FechaHora | null = null,
): Combo {
  return unwrap(
    Combo.crear(
      {
        id: unwrap(ComboId.of(COMBO_ID)),
        nombre: nombre('Combo Desayuno'),
        descripcion: 'Café + Pan',
        imagenUrl: null,
        precio: money(8000),
        items,
        vigenciaDesde,
        vigenciaHasta,
        ahora: AHORA,
      },
      EVT,
    ),
  );
}

// ──────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────

describe('Combo — invariante 1: items >= 1', () => {
  it('crear sin items falla', () => {
    const r = Combo.crear(
      {
        id: unwrap(ComboId.of(COMBO_ID)),
        nombre: nombre('Xy'),
        descripcion: '',
        imagenUrl: null,
        precio: money(0),
        items: [],
        vigenciaDesde: null,
        vigenciaHasta: null,
        ahora: AHORA,
      },
      EVT,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(ComboSinItemsError);
  });

  it('eliminar el último item falla', () => {
    const combo = crearCombo([item(ITEM_1, VARIANT_1)]);
    const r = combo.eliminarItem(unwrap(ComboItemId.of(ITEM_1)), AHORA, EVT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(ComboSinItemsError);
  });
});

describe('Combo — invariante 2: id de item único', () => {
  it('crear con dos items con mismo id falla', () => {
    const r = Combo.crear(
      {
        id: unwrap(ComboId.of(COMBO_ID)),
        nombre: nombre('Xy'),
        descripcion: '',
        imagenUrl: null,
        precio: money(8000),
        items: [item(ITEM_1, VARIANT_1), item(ITEM_1, VARIANT_2)],
        vigenciaDesde: null,
        vigenciaHasta: null,
        ahora: AHORA,
      },
      EVT,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(ItemDeComboDuplicadoError);
  });

  it('agregarItem con id existente falla', () => {
    const combo = crearCombo([item(ITEM_1, VARIANT_1)]);
    const r = combo.agregarItem(item(ITEM_1, VARIANT_2), AHORA, EVT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(ItemDeComboDuplicadoError);
  });
});

describe('Combo — invariante 3: variante única entre items', () => {
  it('crear con dos items apuntando a la misma variante falla', () => {
    const r = Combo.crear(
      {
        id: unwrap(ComboId.of(COMBO_ID)),
        nombre: nombre('Xy'),
        descripcion: '',
        imagenUrl: null,
        precio: money(8000),
        items: [item(ITEM_1, VARIANT_1), item(ITEM_2, VARIANT_1)],
        vigenciaDesde: null,
        vigenciaHasta: null,
        ahora: AHORA,
      },
      EVT,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(VarianteDuplicadaEnComboError);
  });

  it('agregarItem con variante repetida falla', () => {
    const combo = crearCombo([item(ITEM_1, VARIANT_1)]);
    const r = combo.agregarItem(item(ITEM_2, VARIANT_1), AHORA, EVT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(VarianteDuplicadaEnComboError);
  });

  it('para "2 cafés" se usa cantidad=2 en un solo item', () => {
    const combo = crearCombo([item(ITEM_1, VARIANT_1, 2)]);
    expect(combo.items[0]?.cantidad.valor()).toBe(2);
  });
});

describe('Combo — eliminarItem', () => {
  it('falla si el item no existe', () => {
    const combo = crearCombo([item(ITEM_1, VARIANT_1), item(ITEM_2, VARIANT_2)]);
    const r = combo.eliminarItem(
      unwrap(ComboItemId.of('99999999-9999-9999-9999-999999999999')),
      AHORA,
      EVT,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(ItemDeComboNoEncontradoError);
  });

  it('elimina uno de varios items correctamente', () => {
    const combo = crearCombo([item(ITEM_1, VARIANT_1), item(ITEM_2, VARIANT_2)]);
    const r = combo.eliminarItem(unwrap(ComboItemId.of(ITEM_1)), AHORA, EVT);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.items).toHaveLength(1);
      expect(r.value.items[0]?.id.toString()).toBe(ITEM_2);
    }
  });
});

describe('Combo — activar/desactivar', () => {
  it('por defecto se crea activo y vendible', () => {
    const combo = crearCombo([item(ITEM_1, VARIANT_1)]);
    expect(combo.estado).toBe('activo');
    expect(combo.esVendible()).toBe(true);
  });

  it('desactivar emite ComboDesactivado', () => {
    const combo = crearCombo([item(ITEM_1, VARIANT_1)]);
    const r = combo.desactivar(AHORA, EVT);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.estado).toBe('inactivo');
      expect(r.value.esVendible()).toBe(false);
      const eventos = r.value.pullDomainEvents();
      expect(eventos.some((e) => e.tipo === 'ComboDesactivado')).toBe(true);
    }
  });

  it('desactivar dos veces falla con ComboYaEnEstadoError', () => {
    const inactivo = unwrap(crearCombo([item(ITEM_1, VARIANT_1)]).desactivar(AHORA, EVT));
    const r = inactivo.desactivar(AHORA, EVT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(ComboYaEnEstadoError);
  });

  it('activar un combo ya activo falla', () => {
    const r = crearCombo([item(ITEM_1, VARIANT_1)]).activar(AHORA, EVT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(ComboYaEnEstadoError);
  });

  it('reactivar un combo inactivo funciona', () => {
    const inactivo = unwrap(crearCombo([item(ITEM_1, VARIANT_1)]).desactivar(AHORA, EVT));
    const r = inactivo.activar(AHORA, EVT);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.estado).toBe('activo');
  });
});

describe('Combo — cambiarPrecio', () => {
  it('emite PrecioDeComboCambiado', () => {
    const combo = crearCombo([item(ITEM_1, VARIANT_1)]);
    const r = combo.cambiarPrecio(money(7500), AHORA, EVT);
    expect(r.precio.toCop()).toBe(7500);
    const eventos = r.pullDomainEvents();
    expect(eventos.some((e) => e.tipo === 'PrecioDeComboCambiado')).toBe(true);
  });
});

describe('Combo — vigencia temporal (invariante 7)', () => {
  it('ambas vigencias null: combo siempre vigente', () => {
    const combo = crearCombo([item(ITEM_1, VARIANT_1)], null, null);
    expect(combo.estaVigenteEn(AHORA)).toBe(true);
  });

  it('vigenciaDesde > vigenciaHasta falla al crear', () => {
    const r = Combo.crear(
      {
        id: unwrap(ComboId.of(COMBO_ID)),
        nombre: nombre('Xy'),
        descripcion: '',
        imagenUrl: null,
        precio: money(8000),
        items: [item(ITEM_1, VARIANT_1)],
        vigenciaDesde: EN_UN_DIA,
        vigenciaHasta: HACE_UN_DIA,
        ahora: AHORA,
      },
      EVT,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(VigenciaInvalidaError);
  });

  it('solo vigenciaDesde: disponible a partir de esa fecha', () => {
    const combo = crearCombo([item(ITEM_1, VARIANT_1)], EN_UN_DIA, null);
    expect(combo.estaVigenteEn(AHORA)).toBe(false);
    expect(combo.estaVigenteEn(EN_UN_DIA)).toBe(true);
  });

  it('solo vigenciaHasta: disponible hasta esa fecha', () => {
    const combo = crearCombo([item(ITEM_1, VARIANT_1)], null, HACE_UN_DIA);
    expect(combo.estaVigenteEn(AHORA)).toBe(false);
    expect(combo.estaVigenteEn(HACE_UN_DIA)).toBe(true);
  });

  it('ambas vigencias presentes y válidas: combo vigente dentro del rango', () => {
    const combo = crearCombo([item(ITEM_1, VARIANT_1)], HACE_UN_DIA, EN_UN_DIA);
    expect(combo.estaVigenteEn(AHORA)).toBe(true);
    expect(combo.estaVigenteEn(HACE_UN_DIA)).toBe(true);
    expect(combo.estaVigenteEn(EN_UN_DIA)).toBe(true);
  });

  it('vigenciaDesde === vigenciaHasta es válido (combo de un instante)', () => {
    const r = Combo.crear(
      {
        id: unwrap(ComboId.of(COMBO_ID)),
        nombre: nombre('Xy'),
        descripcion: '',
        imagenUrl: null,
        precio: money(8000),
        items: [item(ITEM_1, VARIANT_1)],
        vigenciaDesde: AHORA,
        vigenciaHasta: AHORA,
        ahora: AHORA,
      },
      EVT,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.estaVigenteEn(AHORA)).toBe(true);
  });

  it('cambiarVigencia con rango inválido falla', () => {
    const combo = crearCombo([item(ITEM_1, VARIANT_1)]);
    const r = combo.cambiarVigencia(EN_UN_DIA, HACE_UN_DIA, AHORA, EVT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(VigenciaInvalidaError);
  });

  it('cambiarVigencia con rango válido emite VigenciaDeComboCambiada', () => {
    const combo = crearCombo([item(ITEM_1, VARIANT_1)]);
    const r = combo.cambiarVigencia(HACE_UN_DIA, EN_UN_DIA, AHORA, EVT);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.vigenciaDesde?.toTimestamp()).toBe(HACE_UN_DIA.toTimestamp());
      expect(r.value.vigenciaHasta?.toTimestamp()).toBe(EN_UN_DIA.toTimestamp());
      expect(r.value.pullDomainEvents().some((e) => e.tipo === 'VigenciaDeComboCambiada')).toBe(
        true,
      );
    }
  });

  it('combo inactivo pero vigente en fecha no es vendible (esVendible es independiente de estaVigenteEn)', () => {
    const activo = crearCombo([item(ITEM_1, VARIANT_1)], HACE_UN_DIA, EN_UN_DIA);
    const inactivo = unwrap(activo.desactivar(AHORA, EVT));
    expect(inactivo.estaVigenteEn(AHORA)).toBe(true);
    expect(inactivo.esVendible()).toBe(false);
  });
});

describe('Combo — inmutabilidad', () => {
  it('mutaciones devuelven nueva instancia sin alterar la original', () => {
    const combo = crearCombo([item(ITEM_1, VARIANT_1)]);
    const conDos = unwrap(combo.agregarItem(item(ITEM_2, VARIANT_2), AHORA, EVT));
    expect(combo.items).toHaveLength(1);
    expect(conDos.items).toHaveLength(2);
    expect(combo).not.toBe(conDos);
  });
});
