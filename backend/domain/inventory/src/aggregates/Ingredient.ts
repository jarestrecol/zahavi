import { type Result, ok, err } from '../errors/DomainError.js';
import { Money, FechaHora } from '@zahavi/domain-shared-kernel';
import {
  CostoUnitarioNegativoError,
  UmbralDeAlertaInvalidoError,
  IngredienteYaEnEstadoError,
} from '../errors/index.js';
import { UnidadNativa } from '../value-objects/enums.js';
import { IngredientId } from '../value-objects/ids.js';
import type {
  InventoryDomainEvent,
  IngredienteCreado,
  CostoDeIngredienteCambiado,
  UmbralDeIngredienteCambiado,
  IngredienteDesactivado,
  IngredienteReactivado,
} from '../events/index.js';

export interface IngredientProps {
  readonly id: IngredientId;
  readonly nombre: string;
  readonly unidadNativa: UnidadNativa;
  readonly costoUnitarioActual: Money;
  readonly umbralDeAlerta: number;
  readonly estado: 'activo' | 'inactivo';
  readonly creadoEn: FechaHora;
}

type IngredientPropsOverride = Partial<
  Pick<IngredientProps, 'costoUnitarioActual' | 'umbralDeAlerta' | 'estado'>
>;

/**
 * Aggregate root `Ingrediente`.
 *
 * Invariantes:
 *   1. costoUnitarioActual >= 0 (cero es válido: ingrediente propio sin costo registrado)
 *   2. umbralDeAlerta >= 0 (cero deshabilita la alerta)
 *   3. Estado monotónico: activo → inactivo o inactivo → activo (no otros estados)
 *
 * `umbralDeAlerta` se expresa en la `unidadNativa` del ingrediente.
 * Cuando el stock disponible cae por debajo de este umbral, el BC emite
 * `AlertaDeStockAbierta` desde `StockItem` — no desde `Ingredient` directamente.
 */
export class Ingredient {
  readonly id: IngredientId;
  readonly nombre: string;
  readonly unidadNativa: UnidadNativa;
  readonly costoUnitarioActual: Money;
  readonly umbralDeAlerta: number;
  readonly estado: 'activo' | 'inactivo';
  readonly creadoEn: FechaHora;

  private readonly _events: InventoryDomainEvent[];

  private constructor(props: IngredientProps, events: InventoryDomainEvent[] = []) {
    this.id = props.id;
    this.nombre = props.nombre;
    this.unidadNativa = props.unidadNativa;
    this.costoUnitarioActual = props.costoUnitarioActual;
    this.umbralDeAlerta = props.umbralDeAlerta;
    this.estado = props.estado;
    this.creadoEn = props.creadoEn;
    this._events = events;
  }

  // ── Factorías ────────────────────────────────────────────────

  static crear(
    props: {
      id: IngredientId;
      nombre: string;
      unidadNativa: UnidadNativa;
      costoUnitarioActual: Money;
      umbralDeAlerta: number;
      ahora: FechaHora;
    },
    eventoId: string,
  ): Result<Ingredient, CostoUnitarioNegativoError | UmbralDeAlertaInvalidoError> {
    if (props.costoUnitarioActual.toCop() < 0)
      return err(new CostoUnitarioNegativoError(props.costoUnitarioActual.toCop()));
    if (props.umbralDeAlerta < 0)
      return err(new UmbralDeAlertaInvalidoError('umbral debe ser >= 0'));

    const ingrediente = new Ingredient({
      id: props.id,
      nombre: props.nombre,
      unidadNativa: props.unidadNativa,
      costoUnitarioActual: props.costoUnitarioActual,
      umbralDeAlerta: props.umbralDeAlerta,
      estado: 'activo',
      creadoEn: props.ahora,
    });

    const evento: IngredienteCreado = {
      eventoId,
      tipo: 'IngredienteCreado',
      aggregateId: props.id.toString(),
      ocurridoEn: props.ahora.toTimestamp(),
      version: 1,
      payload: {
        ingredientId: props.id.toString(),
        nombre: props.nombre,
        unidadNativa: props.unidadNativa,
        costoUnitarioInicial: props.costoUnitarioActual.toCop(),
        umbralDeAlerta: props.umbralDeAlerta,
      },
    };
    ingrediente._events.push(evento);
    return ok(ingrediente);
  }

  static reconstituir(props: IngredientProps): Ingredient {
    return new Ingredient(props, []);
  }

  // ── Comandos ─────────────────────────────────────────────────

  cambiarCosto(
    nuevoCosto: Money,
    ahora: FechaHora,
    eventoId: string,
  ): Result<Ingredient, CostoUnitarioNegativoError> {
    if (nuevoCosto.toCop() < 0) return err(new CostoUnitarioNegativoError(nuevoCosto.toCop()));

    const nuevo = this._con({ costoUnitarioActual: nuevoCosto });
    const evento: CostoDeIngredienteCambiado = {
      eventoId,
      tipo: 'CostoDeIngredienteCambiado',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        ingredientId: this.id.toString(),
        costoPrevio: this.costoUnitarioActual.toCop(),
        costoNuevo: nuevoCosto.toCop(),
      },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  cambiarUmbral(
    nuevoUmbral: number,
    ahora: FechaHora,
    eventoId: string,
  ): Result<Ingredient, UmbralDeAlertaInvalidoError> {
    if (nuevoUmbral < 0) return err(new UmbralDeAlertaInvalidoError('umbral debe ser >= 0'));

    const nuevo = this._con({ umbralDeAlerta: nuevoUmbral });
    const evento: UmbralDeIngredienteCambiado = {
      eventoId,
      tipo: 'UmbralDeIngredienteCambiado',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        ingredientId: this.id.toString(),
        umbralPrevio: this.umbralDeAlerta,
        umbralNuevo: nuevoUmbral,
      },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  desactivar(ahora: FechaHora, eventoId: string): Result<Ingredient, IngredienteYaEnEstadoError> {
    if (this.estado === 'inactivo') return err(new IngredienteYaEnEstadoError('inactivo'));

    const nuevo = this._con({ estado: 'inactivo' });
    const evento: IngredienteDesactivado = {
      eventoId,
      tipo: 'IngredienteDesactivado',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: { ingredientId: this.id.toString() },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  reactivar(ahora: FechaHora, eventoId: string): Result<Ingredient, IngredienteYaEnEstadoError> {
    if (this.estado === 'activo') return err(new IngredienteYaEnEstadoError('activo'));

    const nuevo = this._con({ estado: 'activo' });
    const evento: IngredienteReactivado = {
      eventoId,
      tipo: 'IngredienteReactivado',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: { ingredientId: this.id.toString() },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  // ── Consultas ────────────────────────────────────────────────

  esActivo(): boolean {
    return this.estado === 'activo';
  }

  pullDomainEvents(): InventoryDomainEvent[] {
    return [...this._events];
  }

  // ── Helpers ──────────────────────────────────────────────────

  private _props(): IngredientProps {
    return {
      id: this.id,
      nombre: this.nombre,
      unidadNativa: this.unidadNativa,
      costoUnitarioActual: this.costoUnitarioActual,
      umbralDeAlerta: this.umbralDeAlerta,
      estado: this.estado,
      creadoEn: this.creadoEn,
    };
  }

  private _con(overrides: IngredientPropsOverride): Ingredient {
    return new Ingredient({ ...this._props(), ...overrides }, []);
  }
}
