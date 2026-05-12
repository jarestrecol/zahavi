import { describe, it, expect } from 'vitest';
import { Money, FechaHora } from '@zahavi/domain-shared-kernel';
import { Ingredient } from '../../aggregates/Ingredient.js';
import { IngredientId } from '../../value-objects/ids.js';
import { UnidadNativa } from '../../value-objects/enums.js';
import {
  CostoUnitarioNegativoError,
  UmbralDeAlertaInvalidoError,
  IngredienteYaEnEstadoError,
} from '../../errors/index.js';

const ING_ID = '00000000-0000-0000-0000-000000000001';
const EVT = '00000000-0000-0000-0000-0000000000ff';
const AHORA = FechaHora.deTimestamp(1_700_000_000_000);

function unwrap<T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!r.ok) throw new Error(`Esperaba ok, recibí: ${JSON.stringify(r.error)}`);
  return r.value;
}

function ingredientId(): IngredientId {
  return unwrap(IngredientId.of(ING_ID));
}

function money(v: number): Money {
  return unwrap(Money.deCop(v));
}

function crear(opts: { costo?: number; umbral?: number } = {}): Ingredient {
  return unwrap(
    Ingredient.crear(
      {
        id: ingredientId(),
        nombre: 'Harina de trigo',
        unidadNativa: UnidadNativa.KILOGRAMO,
        costoUnitarioActual: money(opts.costo ?? 3500),
        umbralDeAlerta: opts.umbral ?? 10,
        ahora: AHORA,
      },
      EVT,
    ),
  );
}

describe('Ingredient.crear', () => {
  it('crea con datos válidos en estado activo', () => {
    const ing = crear();
    expect(ing.nombre).toBe('Harina de trigo');
    expect(ing.unidadNativa).toBe(UnidadNativa.KILOGRAMO);
    expect(ing.costoUnitarioActual.toCop()).toBe(3500);
    expect(ing.umbralDeAlerta).toBe(10);
    expect(ing.estado).toBe('activo');
    expect(ing.esActivo()).toBe(true);
  });

  it('emite IngredienteCreado al crear', () => {
    const ing = crear();
    const eventos = ing.pullDomainEvents();
    expect(eventos).toHaveLength(1);
    expect(eventos[0]?.tipo).toBe('IngredienteCreado');
    expect(eventos[0]?.aggregateId).toBe(ING_ID);
    if (eventos[0]?.tipo === 'IngredienteCreado') {
      expect(eventos[0].payload.costoUnitarioInicial).toBe(3500);
      expect(eventos[0].payload.umbralDeAlerta).toBe(10);
    }
  });

  it('crear con umbral cero es válido (deshabilita la alerta)', () => {
    const ing = crear({ umbral: 0 });
    expect(ing.umbralDeAlerta).toBe(0);
  });

  it('crear con umbral negativo retorna UmbralDeAlertaInvalidoError', () => {
    const r = Ingredient.crear(
      {
        id: ingredientId(),
        nombre: 'X',
        unidadNativa: UnidadNativa.GRAMO,
        costoUnitarioActual: money(0),
        umbralDeAlerta: -1,
        ahora: AHORA,
      },
      EVT,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(UmbralDeAlertaInvalidoError);
  });

  it('crear con costo cero es válido', () => {
    const ing = crear({ costo: 0 });
    expect(ing.costoUnitarioActual.toCop()).toBe(0);
  });
});

describe('Ingredient.cambiarCosto', () => {
  it('cambia el costo a un valor positivo y conserva eventos previos', () => {
    const ing = crear();
    const nuevo = unwrap(ing.cambiarCosto(money(4200), AHORA, EVT));
    expect(nuevo.costoUnitarioActual.toCop()).toBe(4200);
    const eventos = nuevo.pullDomainEvents();
    expect(eventos.map((e) => e.tipo)).toEqual(['IngredienteCreado', 'CostoDeIngredienteCambiado']);
  });

  it('no muta el agregado original (inmutabilidad)', () => {
    const ing = crear();
    ing.cambiarCosto(money(9999), AHORA, EVT);
    expect(ing.costoUnitarioActual.toCop()).toBe(3500);
  });
});

describe('Ingredient.cambiarUmbral', () => {
  it('permite cambiar a cero', () => {
    const ing = crear();
    const nuevo = unwrap(ing.cambiarUmbral(0, AHORA, EVT));
    expect(nuevo.umbralDeAlerta).toBe(0);
  });

  it('cambiar a negativo retorna UmbralDeAlertaInvalidoError', () => {
    const ing = crear();
    const r = ing.cambiarUmbral(-5, AHORA, EVT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(UmbralDeAlertaInvalidoError);
  });
});

describe('Ingredient.desactivar / reactivar', () => {
  it('desactiva un ingrediente activo', () => {
    const ing = crear();
    const inactivo = unwrap(ing.desactivar(AHORA, EVT));
    expect(inactivo.estado).toBe('inactivo');
    expect(inactivo.esActivo()).toBe(false);
    expect(inactivo.pullDomainEvents().map((e) => e.tipo)).toContain('IngredienteDesactivado');
  });

  it('desactivar uno ya inactivo retorna IngredienteYaEnEstadoError', () => {
    const ing = crear();
    const inactivo = unwrap(ing.desactivar(AHORA, EVT));
    const r = inactivo.desactivar(AHORA, EVT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(IngredienteYaEnEstadoError);
  });

  it('reactiva un ingrediente inactivo', () => {
    const ing = crear();
    const inactivo = unwrap(ing.desactivar(AHORA, EVT));
    const activo = unwrap(inactivo.reactivar(AHORA, EVT));
    expect(activo.estado).toBe('activo');
    expect(activo.pullDomainEvents().map((e) => e.tipo)).toContain('IngredienteReactivado');
  });

  it('reactivar uno ya activo retorna IngredienteYaEnEstadoError', () => {
    const ing = crear();
    const r = ing.reactivar(AHORA, EVT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(IngredienteYaEnEstadoError);
  });
});

describe('Ingredient.pullDomainEvents / reconstituir', () => {
  it('pullDomainEvents devuelve una copia (no la referencia interna)', () => {
    const ing = crear();
    const a = ing.pullDomainEvents();
    const b = ing.pullDomainEvents();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  it('reconstituir no produce eventos', () => {
    const ing = Ingredient.reconstituir({
      id: ingredientId(),
      nombre: 'Harina',
      unidadNativa: UnidadNativa.KILOGRAMO,
      costoUnitarioActual: money(3500),
      umbralDeAlerta: 10,
      estado: 'activo',
      creadoEn: AHORA,
    });
    expect(ing.pullDomainEvents()).toHaveLength(0);
    expect(ing.costoUnitarioActual.toCop()).toBe(3500);
  });
});
