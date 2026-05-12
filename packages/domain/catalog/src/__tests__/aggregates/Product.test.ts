import { describe, it, expect } from 'vitest';
import { Product } from '../../aggregates/Product.js';
import { Recipe } from '../../aggregates/Recipe.js';
import { ProductVariant } from '../../entities/ProductVariant.js';
import { RecipeLine } from '../../entities/RecipeLine.js';
import {
  ProductId,
  ProductVariantId,
  CategoryId,
  RecipeId,
  RecipeLineId,
  IngredientId,
} from '../../value-objects/ids.js';
import { NombreDeCatalogo } from '../../value-objects/NombreDeCatalogo.js';
import { Money } from '../../value-objects/Money.js';
import { Cantidad } from '../../value-objects/Cantidad.js';
import { FechaHora } from '../../value-objects/FechaHora.js';
import {
  ProductoSinVariantesError,
  VarianteDuplicadaError,
  VarianteNoEncontradaError,
  PrecioInvalidoError,
  ProductoYaEnEstadoError,
  RecetaNoCorrespondeAVarianteError,
} from '../../errors/index.js';

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

const PRODUCT_ID = '11111111-1111-1111-1111-111111111111';
const VARIANT_ID_1 = '33333333-3333-3333-3333-333333333333';
const VARIANT_ID_2 = '44444444-4444-4444-4444-444444444444';
const CATEGORY_ID = '55555555-5555-5555-5555-555555555555';
const RECIPE_ID = '66666666-6666-6666-6666-666666666666';
const LINE_ID_1 = '77777777-7777-7777-7777-777777777777';
const INGREDIENT_ID_1 = '88888888-8888-8888-8888-888888888888';
const EVT = '99999999-9999-9999-9999-999999999999';

const AHORA = FechaHora.deTimestamp(1_700_000_000_000);

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

function variante(id: string, label: string, precio: number, recetaId: string | null = null): ProductVariant {
  return unwrap(
    ProductVariant.crear({
      id: unwrap(ProductVariantId.of(id)),
      nombre: nombre(label),
      precio: money(precio),
      recetaId: recetaId ? unwrap(RecipeId.of(recetaId)) : null,
    }),
  );
}

function crearProducto(): Product {
  return unwrap(
    Product.crear(
      {
        id: unwrap(ProductId.of(PRODUCT_ID)),
        nombre: nombre('Café'),
        categoriaId: unwrap(CategoryId.of(CATEGORY_ID)),
        imagenUrl: null,
        varianteInicial: variante(VARIANT_ID_1, 'Mediano', 5000),
        ahora: AHORA,
      },
      EVT,
    ),
  );
}

function crearRecetaParaVariante(varianteId: string): Recipe {
  return unwrap(
    Recipe.crear(
      {
        id: unwrap(RecipeId.of(RECIPE_ID)),
        varianteId: unwrap(ProductVariantId.of(varianteId)),
        lineas: [
          RecipeLine.crear({
            id: unwrap(RecipeLineId.of(LINE_ID_1)),
            ingredientId: unwrap(IngredientId.of(INGREDIENT_ID_1)),
            cantidad: unwrap(Cantidad.de(0.02, 'kilogramo')),
            esEmpaque: false,
          }),
        ],
        ahora: AHORA,
      },
      EVT,
    ),
  );
}

// ──────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────

describe('Product — creación', () => {
  it('crea un producto en estado borrador con una variante inicial', () => {
    const producto = crearProducto();
    expect(producto.estado).toBe('borrador');
    expect(producto.variantes).toHaveLength(1);
    expect(producto.imagenUrl).toBeNull();
    expect(producto.estaDisponibleParaVenta()).toBe(false);
  });

  it('emite evento ProductoCreado al crear', () => {
    const producto = crearProducto();
    const eventos = producto.pullDomainEvents();
    expect(eventos).toHaveLength(1);
    expect(eventos[0]?.tipo).toBe('ProductoCreado');
  });
});

describe('Product — invariante 1: variantes >= 1', () => {
  it('eliminar la última variante falla con ProductoSinVariantesError', () => {
    const producto = crearProducto();
    const r = producto.eliminarVariante(unwrap(ProductVariantId.of(VARIANT_ID_1)), AHORA, EVT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(ProductoSinVariantesError);
  });

  it('eliminar una de varias variantes funciona', () => {
    const producto = crearProducto();
    const conDos = unwrap(
      producto.agregarVariante(variante(VARIANT_ID_2, 'Grande', 7000), AHORA, EVT),
    );
    const r = conDos.eliminarVariante(unwrap(ProductVariantId.of(VARIANT_ID_1)), AHORA, EVT);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.variantes).toHaveLength(1);
  });
});

describe('Product — invariante 2: precio de variante > 0', () => {
  it('crear variante con precio 0 falla', () => {
    const r = ProductVariant.crear({
      id: unwrap(ProductVariantId.of(VARIANT_ID_1)),
      nombre: nombre('Mediano'),
      precio: money(0),
      recetaId: null,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(PrecioInvalidoError);
  });

  it('cambiarPrecioDeVariante con precio 0 falla', () => {
    const producto = crearProducto();
    const r = producto.cambiarPrecioDeVariante(
      unwrap(ProductVariantId.of(VARIANT_ID_1)),
      money(0),
      AHORA,
      EVT,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(PrecioInvalidoError);
  });
});

describe('Product — invariante 3: id de variante único en el aggregate', () => {
  it('agregar una variante con id duplicado falla', () => {
    const producto = crearProducto();
    const r = producto.agregarVariante(variante(VARIANT_ID_1, 'Otra', 6000), AHORA, EVT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(VarianteDuplicadaError);
  });
});

describe('Product — activación (sin requisito de receta a nivel producto)', () => {
  it('activar un producto con variantes funciona directamente', () => {
    const producto = crearProducto();
    const r = producto.activar(AHORA, EVT);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.estado).toBe('activo');
      expect(r.value.estaDisponibleParaVenta()).toBe(true);
    }
  });

  it('activar dos veces falla con ProductoYaEnEstadoError', () => {
    const activo = unwrap(crearProducto().activar(AHORA, EVT));
    const r = activo.activar(AHORA, EVT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(ProductoYaEnEstadoError);
  });

  it('desactivar un producto activo lo vuelve a borrador', () => {
    const activo = unwrap(crearProducto().activar(AHORA, EVT));
    const r = activo.desactivar('descontinuado', AHORA, EVT);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.estado).toBe('borrador');
  });
});

describe('Product — vincularRecetaAVariante', () => {
  it('vincula receta a una variante existente', () => {
    const producto = crearProducto();
    const r = producto.vincularRecetaAVariante(
      unwrap(ProductVariantId.of(VARIANT_ID_1)),
      unwrap(RecipeId.of(RECIPE_ID)),
      AHORA,
      EVT,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      const varianteActualizada = r.value.variantes.find(
        (v) => v.id.equals(unwrap(ProductVariantId.of(VARIANT_ID_1))),
      );
      expect(varianteActualizada?.recetaId?.toString()).toBe(RECIPE_ID);
      const eventos = r.value.pullDomainEvents();
      expect(eventos.some((e) => e.tipo === 'RecetaVinculadaAVariante')).toBe(true);
    }
  });

  it('vincular receta a variante inexistente falla', () => {
    const producto = crearProducto();
    const r = producto.vincularRecetaAVariante(
      unwrap(ProductVariantId.of(VARIANT_ID_2)),
      unwrap(RecipeId.of(RECIPE_ID)),
      AHORA,
      EVT,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(VarianteNoEncontradaError);
  });
});

describe('Product — variante de reventa', () => {
  it('una variante sin recetaId es de reventa', () => {
    const v = variante(VARIANT_ID_1, 'Coca-Cola', 3500, null);
    expect(v.esDeReventa()).toBe(true);
  });

  it('una variante con recetaId no es de reventa', () => {
    const v = variante(VARIANT_ID_1, 'Café Mediano', 5000, RECIPE_ID);
    expect(v.esDeReventa()).toBe(false);
  });
});

describe('Product — variantes no encontradas', () => {
  it('eliminarVariante con id inexistente falla', () => {
    const producto = crearProducto();
    const r = producto.eliminarVariante(unwrap(ProductVariantId.of(VARIANT_ID_2)), AHORA, EVT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(VarianteNoEncontradaError);
  });

  it('cambiarPrecioDeVariante con id inexistente falla', () => {
    const producto = crearProducto();
    const r = producto.cambiarPrecioDeVariante(
      unwrap(ProductVariantId.of(VARIANT_ID_2)),
      money(8000),
      AHORA,
      EVT,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(VarianteNoEncontradaError);
  });
});

describe('Product — calcularMargen', () => {
  it('falla si la receta no corresponde a la variante solicitada', () => {
    const producto = crearProducto();
    const recetaDeOtraVariante = crearRecetaParaVariante(VARIANT_ID_2);
    const costos = new Map<string, Money>([[INGREDIENT_ID_1, money(50000)]]);

    const r = producto.calcularMargen(
      unwrap(ProductVariantId.of(VARIANT_ID_1)),
      recetaDeOtraVariante,
      costos,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(RecetaNoCorrespondeAVarianteError);
  });

  it('calcula margen positivo correctamente', () => {
    const producto = crearProducto();
    const receta = crearRecetaParaVariante(VARIANT_ID_1);
    // 50000 COP/kg * 0.02 kg = 1000 COP de costo
    const costos = new Map<string, Money>([[INGREDIENT_ID_1, money(50000)]]);

    const r = producto.calcularMargen(
      unwrap(ProductVariantId.of(VARIANT_ID_1)),
      receta,
      costos,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.precioVenta.toCop()).toBe(5000);
      expect(r.value.costoUnitario.toCop()).toBe(1000);
      expect(r.value.montoMargen.toCop()).toBe(4000);
      expect(r.value.porcentajeMargen).toBeCloseTo(80, 5);
    }
  });

  it('falla si la variante no existe en el producto', () => {
    const producto = crearProducto();
    const receta = crearRecetaParaVariante(VARIANT_ID_2);
    const costos = new Map<string, Money>([[INGREDIENT_ID_1, money(50000)]]);

    const r = producto.calcularMargen(
      unwrap(ProductVariantId.of(VARIANT_ID_2)),
      receta,
      costos,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(VarianteNoEncontradaError);
  });
});

describe('Product — imagenUrl', () => {
  it('producto creado sin imagen tiene imagenUrl null', () => {
    const producto = crearProducto();
    expect(producto.imagenUrl).toBeNull();
  });

  it('cambiarImagen actualiza la imagen y emite evento', () => {
    const producto = crearProducto();
    const r = producto.cambiarImagen('https://cdn.zahavi.co/cafe.jpg', AHORA, EVT);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.imagenUrl).toBe('https://cdn.zahavi.co/cafe.jpg');
      expect(r.value.pullDomainEvents().some((e) => e.tipo === 'ImagenDeProductoCambiada')).toBe(true);
    }
  });

  it('cambiarImagen a null limpia la imagen', () => {
    const producto = crearProducto();
    const conImagen = unwrap(producto.cambiarImagen('https://cdn.zahavi.co/cafe.jpg', AHORA, EVT));
    const r = conImagen.cambiarImagen(null, AHORA, EVT);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.imagenUrl).toBeNull();
  });
});

describe('Product — inmutabilidad', () => {
  it('mutaciones devuelven una nueva instancia y no alteran la original', () => {
    const producto = crearProducto();
    const conDos = unwrap(
      producto.agregarVariante(variante(VARIANT_ID_2, 'Grande', 7000), AHORA, EVT),
    );
    expect(producto.variantes).toHaveLength(1);
    expect(conDos.variantes).toHaveLength(2);
    expect(producto).not.toBe(conDos);
  });
});
