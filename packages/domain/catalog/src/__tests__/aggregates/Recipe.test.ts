import { describe, it, expect } from 'vitest';
import { Recipe } from '../../aggregates/Recipe.js';
import { RecipeLine } from '../../entities/RecipeLine.js';
import {
  ProductVariantId,
  RecipeId,
  RecipeLineId,
  IngredientId,
} from '../../value-objects/ids.js';
import { Cantidad } from '../../value-objects/Cantidad.js';
import { Money } from '../../value-objects/Money.js';
import { FechaHora } from '../../value-objects/FechaHora.js';
import {
  RecetaSinLineasError,
  LineaDeRecetaDuplicadaError,
  LineaDeRecetaNoEncontradaError,
  IngredienteDuplicadoEnRecetaError,
  CostoIngredienteNoDisponibleError,
  CostoCeroSospechosoError,
} from '../../errors/index.js';

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

const VARIANT_ID = '11111111-1111-1111-1111-111111111111';
const RECIPE_ID = '22222222-2222-2222-2222-222222222222';
const LINE_1 = '33333333-3333-3333-3333-333333333333';
const LINE_2 = '44444444-4444-4444-4444-444444444444';
const ING_1 = '55555555-5555-5555-5555-555555555555';
const ING_2 = '66666666-6666-6666-6666-666666666666';
const EVT = '77777777-7777-7777-7777-777777777777';

const AHORA = FechaHora.deTimestamp(1_700_000_000_000);

function unwrap<T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!r.ok) throw new Error(`Esperaba ok, recibí: ${JSON.stringify(r.error)}`);
  return r.value;
}

function linea(id: string, ingId: string, valor: number, esEmpaque = false): RecipeLine {
  return RecipeLine.crear({
    id: unwrap(RecipeLineId.of(id)),
    ingredientId: unwrap(IngredientId.of(ingId)),
    cantidad: unwrap(Cantidad.de(valor, 'kilogramo')),
    esEmpaque,
  });
}

function crearReceta(lineas: ReadonlyArray<RecipeLine>): Recipe {
  return unwrap(
    Recipe.crear(
      {
        id: unwrap(RecipeId.of(RECIPE_ID)),
        varianteId: unwrap(ProductVariantId.of(VARIANT_ID)),
        lineas,
        ahora: AHORA,
      },
      EVT,
    ),
  );
}

// ──────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────

describe('Recipe — invariante 1: lineas >= 1', () => {
  it('crear sin líneas falla', () => {
    const r = Recipe.crear(
      {
        id: unwrap(RecipeId.of(RECIPE_ID)),
        varianteId: unwrap(ProductVariantId.of(VARIANT_ID)),
        lineas: [],
        ahora: AHORA,
      },
      EVT,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(RecetaSinLineasError);
  });

  it('eliminar la última línea falla', () => {
    const receta = crearReceta([linea(LINE_1, ING_1, 0.1)]);
    const r = receta.eliminarLinea(unwrap(RecipeLineId.of(LINE_1)), AHORA, EVT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(RecetaSinLineasError);
  });
});

describe('Recipe — invariante 2: id de línea único', () => {
  it('crear con dos líneas con mismo id falla', () => {
    const r = Recipe.crear(
      {
        id: unwrap(RecipeId.of(RECIPE_ID)),
        varianteId: unwrap(ProductVariantId.of(VARIANT_ID)),
        lineas: [linea(LINE_1, ING_1, 0.1), linea(LINE_1, ING_2, 0.2)],
        ahora: AHORA,
      },
      EVT,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(LineaDeRecetaDuplicadaError);
  });

  it('agregarLinea con id existente falla', () => {
    const receta = crearReceta([linea(LINE_1, ING_1, 0.1)]);
    const r = receta.agregarLinea(linea(LINE_1, ING_2, 0.2), AHORA, EVT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(LineaDeRecetaDuplicadaError);
  });
});

describe('Recipe — invariante 3: ingrediente único en la receta', () => {
  it('crear con dos líneas con mismo ingrediente falla', () => {
    const r = Recipe.crear(
      {
        id: unwrap(RecipeId.of(RECIPE_ID)),
        varianteId: unwrap(ProductVariantId.of(VARIANT_ID)),
        lineas: [linea(LINE_1, ING_1, 0.1), linea(LINE_2, ING_1, 0.2)],
        ahora: AHORA,
      },
      EVT,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(IngredienteDuplicadoEnRecetaError);
  });

  it('agregarLinea con ingrediente existente falla', () => {
    const receta = crearReceta([linea(LINE_1, ING_1, 0.1)]);
    const r = receta.agregarLinea(linea(LINE_2, ING_1, 0.05), AHORA, EVT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(IngredienteDuplicadoEnRecetaError);
  });
});

describe('Recipe — versionado monotónico', () => {
  it('crear inicia en version 1', () => {
    const receta = crearReceta([linea(LINE_1, ING_1, 0.1)]);
    expect(receta.version).toBe(1);
  });

  it('cada mutación incrementa la versión', () => {
    const receta = crearReceta([linea(LINE_1, ING_1, 0.1)]);
    const v2 = unwrap(receta.agregarLinea(linea(LINE_2, ING_2, 0.05), AHORA, EVT));
    expect(v2.version).toBe(2);

    const v3 = unwrap(v2.eliminarLinea(unwrap(RecipeLineId.of(LINE_2)), AHORA, EVT));
    expect(v3.version).toBe(3);
  });
});

describe('Recipe — pertenencia a variante', () => {
  it('la receta expone la varianteId a la que pertenece', () => {
    const receta = crearReceta([linea(LINE_1, ING_1, 0.1)]);
    expect(receta.varianteId.toString()).toBe(VARIANT_ID);
  });

  it('ingredientIdsRequeridos devuelve todos los ids de ingredientes', () => {
    const receta = crearReceta([linea(LINE_1, ING_1, 0.1), linea(LINE_2, ING_2, 0.05)]);
    const ids = receta.ingredientIdsRequeridos().map((id) => id.toString());
    expect(ids).toContain(ING_1);
    expect(ids).toContain(ING_2);
  });
});

describe('Recipe — calcularCosto', () => {
  it('falla si falta el costo de algún ingrediente', () => {
    const receta = crearReceta([linea(LINE_1, ING_1, 0.1), linea(LINE_2, ING_2, 0.05)]);
    const costos = new Map<string, Money>([[ING_1, unwrap(Money.deCop(10000))]]);
    const r = receta.calcularCosto(costos);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(CostoIngredienteNoDisponibleError);
  });

  it('suma costoUnitario × cantidad por línea', () => {
    const receta = crearReceta([
      linea(LINE_1, ING_1, 0.02),      // 0.02 kg de ingrediente
      linea(LINE_2, ING_2, 0.1, true), // 0.1 kg de empaque
    ]);
    const costos = new Map<string, Money>([
      [ING_1, unwrap(Money.deCop(50000))], // 50.000 COP/kg → 1000
      [ING_2, unwrap(Money.deCop(2000))],  // 2.000 COP/kg → 200
    ]);
    const r = receta.calcularCosto(costos);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.toCop()).toBe(1200);
  });

  it('falla con CostoCeroSospechosoError si todos los costos son 0', () => {
    const receta = crearReceta([linea(LINE_1, ING_1, 0.1)]);
    const costos = new Map<string, Money>([[ING_1, unwrap(Money.deCop(0))]]);
    const r = receta.calcularCosto(costos);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(CostoCeroSospechosoError);
  });

  it('redondea con Math.round (al peso más cercano)', () => {
    const receta = crearReceta([linea(LINE_1, ING_1, 0.35)]);
    // 8.450 * 0.35 = 2957.5 → 2958
    const costos = new Map<string, Money>([[ING_1, unwrap(Money.deCop(8450))]]);
    const r = receta.calcularCosto(costos);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.toCop()).toBe(2958);
  });
});

describe('Recipe — actualizarLinea', () => {
  it('actualiza cantidad si la línea existe', () => {
    const receta = crearReceta([linea(LINE_1, ING_1, 0.1)]);
    const lineaActualizada = RecipeLine.crear({
      id: unwrap(RecipeLineId.of(LINE_1)),
      ingredientId: unwrap(IngredientId.of(ING_1)),
      cantidad: unwrap(Cantidad.de(0.5, 'kilogramo')),
      esEmpaque: false,
    });
    const r = receta.actualizarLinea(lineaActualizada, AHORA, EVT);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.lineas[0]?.cantidad.valor()).toBe(0.5);
  });

  it('falla si la línea no existe', () => {
    const receta = crearReceta([linea(LINE_1, ING_1, 0.1)]);
    const lineaInexistente = linea(LINE_2, ING_2, 0.5);
    const r = receta.actualizarLinea(lineaInexistente, AHORA, EVT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(LineaDeRecetaNoEncontradaError);
  });

  it('falla si al cambiar el ingrediente se duplica con otra línea', () => {
    const receta = crearReceta([linea(LINE_1, ING_1, 0.1), linea(LINE_2, ING_2, 0.2)]);
    const conflicto = RecipeLine.crear({
      id: unwrap(RecipeLineId.of(LINE_1)),
      ingredientId: unwrap(IngredientId.of(ING_2)),
      cantidad: unwrap(Cantidad.de(0.3, 'kilogramo')),
      esEmpaque: false,
    });
    const r = receta.actualizarLinea(conflicto, AHORA, EVT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(IngredienteDuplicadoEnRecetaError);
  });
});

describe('Recipe — eventos', () => {
  it('crear emite RecetaCreada con varianteId en payload', () => {
    const receta = crearReceta([linea(LINE_1, ING_1, 0.1)]);
    const eventos = receta.pullDomainEvents();
    expect(eventos).toHaveLength(1);
    expect(eventos[0]?.tipo).toBe('RecetaCreada');
    if (eventos[0]?.tipo === 'RecetaCreada') {
      expect(eventos[0].payload.varianteId).toBe(VARIANT_ID);
    }
  });

  it('agregarLinea emite RecetaActualizada con cambio "agregada"', () => {
    const receta = crearReceta([linea(LINE_1, ING_1, 0.1)]);
    const v2 = unwrap(receta.agregarLinea(linea(LINE_2, ING_2, 0.05), AHORA, EVT));
    const eventos = v2.pullDomainEvents();
    const ultimo = eventos[eventos.length - 1];
    expect(ultimo?.tipo).toBe('RecetaActualizada');
    if (ultimo?.tipo === 'RecetaActualizada') {
      expect(ultimo.payload.versionAnterior).toBe(1);
      expect(ultimo.payload.versionNueva).toBe(2);
      expect(ultimo.payload.cambios[0]?.tipo).toBe('agregada');
    }
  });
});
