import { describe, it, expect } from 'vitest';
import { Category } from '../../aggregates/Category.js';
import { CategoryId } from '../../value-objects/ids.js';
import { NombreDeCatalogo } from '../../value-objects/NombreDeCatalogo.js';
import { FechaHora } from '../../value-objects/FechaHora.js';
import {
  AutoReferenciaDeCategoriaError,
  OrdenInvalidoError,
  CategoriaYaEnEstadoError,
} from '../../errors/index.js';

const CAT_ID = '11111111-1111-1111-1111-111111111111';
const PADRE_ID = '22222222-2222-2222-2222-222222222222';
const EVT = '33333333-3333-3333-3333-333333333333';

const AHORA = FechaHora.deTimestamp(1_700_000_000_000);

function unwrap<T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!r.ok) throw new Error(`Esperaba ok, recibí: ${JSON.stringify(r.error)}`);
  return r.value;
}

function nombre(s: string): NombreDeCatalogo {
  return unwrap(NombreDeCatalogo.of(s));
}

function crearCategoria(overrides?: { padreId?: CategoryId | null; orden?: number }): Category {
  return unwrap(
    Category.crear(
      {
        id: unwrap(CategoryId.of(CAT_ID)),
        nombre: nombre('Bebidas'),
        padreId: overrides?.padreId ?? null,
        orden: overrides?.orden ?? 0,
        ahora: AHORA,
      },
      EVT,
    ),
  );
}

describe('Category — invariante 1: orden >= 0 y entero', () => {
  it('orden negativo falla', () => {
    const r = Category.crear(
      {
        id: unwrap(CategoryId.of(CAT_ID)),
        nombre: nombre('Bebidas'),
        padreId: null,
        orden: -1,
        ahora: AHORA,
      },
      EVT,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(OrdenInvalidoError);
  });

  it('orden decimal falla', () => {
    const r = Category.crear(
      {
        id: unwrap(CategoryId.of(CAT_ID)),
        nombre: nombre('Bebidas'),
        padreId: null,
        orden: 1.5,
        ahora: AHORA,
      },
      EVT,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(OrdenInvalidoError);
  });

  it('cambiarOrden con valor negativo falla', () => {
    const cat = crearCategoria();
    const r = cat.cambiarOrden(-3, AHORA, EVT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(OrdenInvalidoError);
  });
});

describe('Category — invariante 2: sin auto-referencia', () => {
  it('crear con padreId == id falla', () => {
    const id = unwrap(CategoryId.of(CAT_ID));
    const r = Category.crear(
      { id, nombre: nombre('Xy'), padreId: id, orden: 0, ahora: AHORA },
      EVT,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(AutoReferenciaDeCategoriaError);
  });

  it('cambiarPadre a sí misma falla', () => {
    const cat = crearCategoria();
    const r = cat.cambiarPadre(unwrap(CategoryId.of(CAT_ID)), AHORA, EVT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(AutoReferenciaDeCategoriaError);
  });

  it('cambiarPadre a otra categoría funciona', () => {
    const cat = crearCategoria();
    const r = cat.cambiarPadre(unwrap(CategoryId.of(PADRE_ID)), AHORA, EVT);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.padreId?.toString()).toBe(PADRE_ID);
  });

  it('cambiarPadre a null (raíz) funciona', () => {
    const cat = crearCategoria({ padreId: unwrap(CategoryId.of(PADRE_ID)) });
    const r = cat.cambiarPadre(null, AHORA, EVT);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.padreId).toBeNull();
  });
});

describe('Category — ciclo de archivar/restaurar', () => {
  it('archivar emite evento y cambia el estado', () => {
    const cat = crearCategoria();
    const r = cat.archivar(AHORA, EVT);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.estado).toBe('archivada');
      const eventos = r.value.pullDomainEvents();
      expect(eventos.some((e) => e.tipo === 'CategoriaArchivada')).toBe(true);
    }
  });

  it('archivar dos veces falla', () => {
    const cat = crearCategoria();
    const archivada = unwrap(cat.archivar(AHORA, EVT));
    const r = archivada.archivar(AHORA, EVT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(CategoriaYaEnEstadoError);
  });

  it('restaurar archivada funciona', () => {
    const cat = crearCategoria();
    const archivada = unwrap(cat.archivar(AHORA, EVT));
    const r = archivada.restaurar(AHORA, EVT);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.estado).toBe('activa');
  });

  it('restaurar activa falla', () => {
    const cat = crearCategoria();
    const r = cat.restaurar(AHORA, EVT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(CategoriaYaEnEstadoError);
  });
});

describe('Category — eventos', () => {
  it('crear emite CategoriaCreada', () => {
    const cat = crearCategoria();
    const eventos = cat.pullDomainEvents();
    expect(eventos).toHaveLength(1);
    expect(eventos[0]?.tipo).toBe('CategoriaCreada');
  });

  it('cambiarNombre emite NombreDeCategoriaCambiado', () => {
    const cat = crearCategoria();
    const renombrada = cat.cambiarNombre(nombre('Cafés'), AHORA, EVT);
    const eventos = renombrada.pullDomainEvents();
    expect(eventos.some((e) => e.tipo === 'NombreDeCategoriaCambiado')).toBe(true);
  });
});
