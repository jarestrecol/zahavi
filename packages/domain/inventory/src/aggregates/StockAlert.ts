import { type Result, ok, err } from '../errors/DomainError.js';
import { FechaHora } from '@zahavi/domain-shared-kernel';
import { AlertaNoAbiertaError } from '../errors/index.js';
import { EstadoDeAlerta, UnidadNativa } from '../value-objects/enums.js';
import { StockAlertId, IngredientId, BusinessUnitId } from '../value-objects/ids.js';
import type {
  InventoryDomainEvent,
  AlertaDeStockAbierta,
  AlertaDeStockCerrada,
  AlertaDeStockAnulada,
} from '../events/index.js';

export interface StockAlertProps {
  readonly id: StockAlertId;
  readonly ingredientId: IngredientId;
  readonly businessUnitId: BusinessUnitId;
  /** Stock disponible en el instante en que se abrió la alerta. */
  readonly stockAlMomento: number;
  /** Umbral de alerta vigente en el instante en que se abrió. */
  readonly umbralAlMomento: number;
  readonly unidad: UnidadNativa;
  readonly estado: EstadoDeAlerta;
  readonly creadaEn: FechaHora;
  readonly cierreEn: FechaHora | null;
}

type StockAlertPropsOverride = Partial<Pick<StockAlertProps, 'estado' | 'cierreEn'>>;

/**
 * Aggregate root `AlertaDeStock`.
 *
 * Una alerta es un hecho de negocio: "el stock de tal ingrediente en tal punto
 * cayó por debajo del umbral en tal momento". Solo puede haber una alerta
 * `ABIERTA` por (ingrediente, unidad de negocio) — esa invariante la asegura la
 * capa de aplicación al consultar antes de abrir.
 *
 * Transiciones de estado válidas:
 *   ABIERTA → CERRADA   (el stock se repuso por encima del umbral)
 *   ABIERTA → ANULADA   (el ingrediente fue desactivado/eliminado)
 * No hay reapertura: si vuelve a caer el stock, se abre una alerta nueva.
 */
export class StockAlert {
  readonly id: StockAlertId;
  readonly ingredientId: IngredientId;
  readonly businessUnitId: BusinessUnitId;
  readonly stockAlMomento: number;
  readonly umbralAlMomento: number;
  readonly unidad: UnidadNativa;
  readonly estado: EstadoDeAlerta;
  readonly creadaEn: FechaHora;
  readonly cierreEn: FechaHora | null;

  private readonly _events: InventoryDomainEvent[];

  private constructor(props: StockAlertProps, events: InventoryDomainEvent[] = []) {
    this.id = props.id;
    this.ingredientId = props.ingredientId;
    this.businessUnitId = props.businessUnitId;
    this.stockAlMomento = props.stockAlMomento;
    this.umbralAlMomento = props.umbralAlMomento;
    this.unidad = props.unidad;
    this.estado = props.estado;
    this.creadaEn = props.creadaEn;
    this.cierreEn = props.cierreEn;
    this._events = events;
  }

  // ── Factorías ────────────────────────────────────────────────

  static abrir(
    props: {
      id: StockAlertId;
      ingredientId: IngredientId;
      businessUnitId: BusinessUnitId;
      stockAlMomento: number;
      umbralAlMomento: number;
      unidad: UnidadNativa;
      ahora: FechaHora;
    },
    eventoId: string,
  ): Result<StockAlert, never> {
    const alerta = new StockAlert({
      id: props.id,
      ingredientId: props.ingredientId,
      businessUnitId: props.businessUnitId,
      stockAlMomento: props.stockAlMomento,
      umbralAlMomento: props.umbralAlMomento,
      unidad: props.unidad,
      estado: EstadoDeAlerta.ABIERTA,
      creadaEn: props.ahora,
      cierreEn: null,
    });

    const evento: AlertaDeStockAbierta = {
      eventoId,
      tipo: 'AlertaDeStockAbierta',
      aggregateId: props.id.toString(),
      ocurridoEn: props.ahora.toTimestamp(),
      version: 1,
      payload: {
        alertaId: props.id.toString(),
        ingredientId: props.ingredientId.toString(),
        businessUnitId: props.businessUnitId.toString(),
        stockActual: props.stockAlMomento,
        umbral: props.umbralAlMomento,
        unidad: props.unidad,
      },
    };
    alerta._events.push(evento);
    return ok(alerta);
  }

  static reconstituir(props: StockAlertProps): StockAlert {
    return new StockAlert(props, []);
  }

  // ── Comandos ─────────────────────────────────────────────────

  /** Cierra la alerta porque el stock se repuso. Solo válido desde ABIERTA. */
  cerrar(ahora: FechaHora, eventoId: string): Result<StockAlert, AlertaNoAbiertaError> {
    if (this.estado !== EstadoDeAlerta.ABIERTA)
      return err(new AlertaNoAbiertaError(this.id.toString(), this.estado));

    const nuevo = this._con({ estado: EstadoDeAlerta.CERRADA, cierreEn: ahora });
    const evento: AlertaDeStockCerrada = {
      eventoId,
      tipo: 'AlertaDeStockCerrada',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        alertaId: this.id.toString(),
        ingredientId: this.ingredientId.toString(),
        businessUnitId: this.businessUnitId.toString(),
      },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  /** Anula la alerta (p. ej. el ingrediente fue desactivado). Solo desde ABIERTA. */
  anular(ahora: FechaHora, eventoId: string): Result<StockAlert, AlertaNoAbiertaError> {
    if (this.estado !== EstadoDeAlerta.ABIERTA)
      return err(new AlertaNoAbiertaError(this.id.toString(), this.estado));

    const nuevo = this._con({ estado: EstadoDeAlerta.ANULADA, cierreEn: ahora });
    const evento: AlertaDeStockAnulada = {
      eventoId,
      tipo: 'AlertaDeStockAnulada',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        alertaId: this.id.toString(),
        ingredientId: this.ingredientId.toString(),
        businessUnitId: this.businessUnitId.toString(),
      },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  // ── Consultas ────────────────────────────────────────────────

  estaAbierta(): boolean {
    return this.estado === EstadoDeAlerta.ABIERTA;
  }

  pullDomainEvents(): InventoryDomainEvent[] {
    return [...this._events];
  }

  // ── Helpers ──────────────────────────────────────────────────

  private _props(): StockAlertProps {
    return {
      id: this.id,
      ingredientId: this.ingredientId,
      businessUnitId: this.businessUnitId,
      stockAlMomento: this.stockAlMomento,
      umbralAlMomento: this.umbralAlMomento,
      unidad: this.unidad,
      estado: this.estado,
      creadaEn: this.creadaEn,
      cierreEn: this.cierreEn,
    };
  }

  private _con(overrides: StockAlertPropsOverride): StockAlert {
    return new StockAlert({ ...this._props(), ...overrides }, []);
  }
}
