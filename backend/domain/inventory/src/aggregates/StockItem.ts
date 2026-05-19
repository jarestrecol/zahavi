import { type Result, ok, err } from '../errors/DomainError.js';
import { Money, FechaHora } from '@zahavi/domain-shared-kernel';
import { StockNegativoError, AjusteSinJustificacionError } from '../errors/index.js';
import { UnidadNativa, TipoMovimiento } from '../value-objects/enums.js';
import {
  StockItemId,
  IngredientId,
  BusinessUnitId,
  StockMovementId,
  SupplierId,
  StockAlertId,
} from '../value-objects/ids.js';
import type {
  InventoryDomainEvent,
  StockItemCreado,
  CompraRegistrada,
  SalidaDeProduccionRegistrada,
  MermaRegistrada,
  AjusteRegistrado,
  AlertaDeStockAbierta,
} from '../events/index.js';

export interface StockItemProps {
  readonly id: StockItemId;
  readonly ingredientId: IngredientId;
  readonly businessUnitId: BusinessUnitId;
  /** Cantidad disponible expresada en `unidadNativa`. Siempre >= 0. */
  readonly cantidadDisponible: number;
  readonly unidadNativa: UnidadNativa;
  /** Costo promedio ponderado por unidad (COP). Siempre >= 0. */
  readonly costoPromedioUnitario: Money;
  /** Versión para detección optimista de concurrencia. Se incrementa en cada mutación. */
  readonly version: number;
  readonly actualizadoEn: FechaHora;
}

type StockItemPropsOverride = Partial<
  Pick<StockItemProps, 'cantidadDisponible' | 'costoPromedioUnitario' | 'version' | 'actualizadoEn'>
>;

/**
 * Aggregate root `StockItem`.
 *
 * Representa el nivel de stock de un ingrediente concreto en una unidad de
 * negocio concreta (planta central o punto de venta). Es la proyección
 * materializada del libro mayor append-only de `StockMovement`.
 *
 * Invariantes:
 *   1. `cantidadDisponible >= 0` siempre. Toda operación que dejaría el stock
 *      negativo se rechaza con `StockNegativoError`. Las correcciones manuales
 *      se hacen vía `ajustar()` con justificación.
 *   2. `costoPromedioUnitario >= 0` (garantizado por el tipo `Money`).
 *   3. Cada mutación incrementa `version` exactamente en 1.
 *
 * El umbral de alerta vive en `Ingredient`. `verificarAlerta()` lo recibe como
 * argumento y, si procede, emite `AlertaDeStockAbierta`; la apertura efectiva
 * del aggregate `StockAlert` la coordina la capa de aplicación.
 */
export class StockItem {
  readonly id: StockItemId;
  readonly ingredientId: IngredientId;
  readonly businessUnitId: BusinessUnitId;
  readonly cantidadDisponible: number;
  readonly unidadNativa: UnidadNativa;
  readonly costoPromedioUnitario: Money;
  readonly version: number;
  readonly actualizadoEn: FechaHora;

  private readonly _events: InventoryDomainEvent[];

  private constructor(props: StockItemProps, events: InventoryDomainEvent[] = []) {
    this.id = props.id;
    this.ingredientId = props.ingredientId;
    this.businessUnitId = props.businessUnitId;
    this.cantidadDisponible = props.cantidadDisponible;
    this.unidadNativa = props.unidadNativa;
    this.costoPromedioUnitario = props.costoPromedioUnitario;
    this.version = props.version;
    this.actualizadoEn = props.actualizadoEn;
    this._events = events;
  }

  // ── Factorías ────────────────────────────────────────────────

  static crear(
    props: {
      id: StockItemId;
      ingredientId: IngredientId;
      businessUnitId: BusinessUnitId;
      unidadNativa: UnidadNativa;
      ahora: FechaHora;
    },
    eventoId: string,
  ): Result<StockItem, never> {
    const stockItem = new StockItem({
      id: props.id,
      ingredientId: props.ingredientId,
      businessUnitId: props.businessUnitId,
      cantidadDisponible: 0,
      unidadNativa: props.unidadNativa,
      costoPromedioUnitario: Money.cero(),
      version: 1,
      actualizadoEn: props.ahora,
    });

    const evento: StockItemCreado = {
      eventoId,
      tipo: 'StockItemCreado',
      aggregateId: props.id.toString(),
      ocurridoEn: props.ahora.toTimestamp(),
      version: 1,
      payload: {
        stockItemId: props.id.toString(),
        ingredientId: props.ingredientId.toString(),
        businessUnitId: props.businessUnitId.toString(),
        cantidadInicial: 0,
        unidad: props.unidadNativa,
      },
    };
    stockItem._events.push(evento);
    return ok(stockItem);
  }

  static reconstituir(props: StockItemProps): StockItem {
    return new StockItem(props, []);
  }

  // ── Comandos ─────────────────────────────────────────────────

  /**
   * Registra una entrada de stock por compra a proveedor.
   * Recalcula el costo promedio ponderado:
   *   nuevoCosto = (stockActual * costoActual + cantidad * costoUnitario) / (stockActual + cantidad)
   */
  registrarIngreso(
    cantidad: number,
    costoUnitario: Money,
    movimientoId: StockMovementId,
    supplierId: SupplierId,
    ahora: FechaHora,
    eventoId: string,
  ): Result<StockItem, StockNegativoError> {
    if (!Number.isFinite(cantidad) || cantidad <= 0)
      return err(new StockNegativoError(this.ingredientId.toString(), cantidad));

    const totalCantidad = this.cantidadDisponible + cantidad;
    const valorPrevio = this.cantidadDisponible * this.costoPromedioUnitario.toCop();
    const valorEntrante = cantidad * costoUnitario.toCop();
    const nuevoCostoPromedio = Math.round((valorPrevio + valorEntrante) / totalCantidad);
    const costoResult = Money.deCop(nuevoCostoPromedio);
    if (!costoResult.ok)
      return err(new StockNegativoError(this.ingredientId.toString(), nuevoCostoPromedio));

    const nuevo = this._con({
      cantidadDisponible: totalCantidad,
      costoPromedioUnitario: costoResult.value,
      version: this.version + 1,
      actualizadoEn: ahora,
    });

    const evento: CompraRegistrada = {
      eventoId,
      tipo: 'CompraRegistrada',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        movimientoId: movimientoId.toString(),
        ingredientId: this.ingredientId.toString(),
        businessUnitId: this.businessUnitId.toString(),
        cantidad,
        unidad: this.unidadNativa,
        costoUnitario: costoUnitario.toCop(),
        supplierId: supplierId.toString(),
      },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  /**
   * Registra una salida de stock por consumo de producción o por merma.
   * Falla con `StockNegativoError` si la salida dejaría stock negativo.
   * Emite `SalidaDeProduccionRegistrada` para `PRODUCTION_OUT`, `MermaRegistrada` para `WASTE`.
   */
  registrarSalida(
    cantidad: number,
    tipoMovimiento: TipoMovimiento.PRODUCTION_OUT | TipoMovimiento.WASTE,
    referencia: string,
    movimientoId: StockMovementId,
    ahora: FechaHora,
    eventoId: string,
  ): Result<StockItem, StockNegativoError> {
    if (!Number.isFinite(cantidad) || cantidad <= 0)
      return err(new StockNegativoError(this.ingredientId.toString(), cantidad));

    const resultante = this.cantidadDisponible - cantidad;
    if (resultante < 0)
      return err(new StockNegativoError(this.ingredientId.toString(), resultante));

    const nuevo = this._con({
      cantidadDisponible: resultante,
      version: this.version + 1,
      actualizadoEn: ahora,
    });

    const evento: SalidaDeProduccionRegistrada | MermaRegistrada =
      tipoMovimiento === TipoMovimiento.PRODUCTION_OUT
        ? {
            eventoId,
            tipo: 'SalidaDeProduccionRegistrada',
            aggregateId: this.id.toString(),
            ocurridoEn: ahora.toTimestamp(),
            version: 1,
            payload: {
              movimientoId: movimientoId.toString(),
              ingredientId: this.ingredientId.toString(),
              businessUnitId: this.businessUnitId.toString(),
              cantidad,
              unidad: this.unidadNativa,
              referenciaProduccion: referencia,
            },
          }
        : {
            eventoId,
            tipo: 'MermaRegistrada',
            aggregateId: this.id.toString(),
            ocurridoEn: ahora.toTimestamp(),
            version: 1,
            payload: {
              movimientoId: movimientoId.toString(),
              ingredientId: this.ingredientId.toString(),
              businessUnitId: this.businessUnitId.toString(),
              cantidad,
              unidad: this.unidadNativa,
              motivo: referencia,
            },
          };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  /**
   * Fuerza el stock a un valor concreto (recount físico o corrección manual).
   * Requiere `motivo` no vacío. La cantidad nueva debe ser >= 0.
   */
  ajustar(
    cantidadNueva: number,
    motivo: string,
    movimientoId: StockMovementId,
    ahora: FechaHora,
    eventoId: string,
  ): Result<StockItem, StockNegativoError | AjusteSinJustificacionError> {
    if (motivo.trim().length === 0) return err(new AjusteSinJustificacionError());
    if (!Number.isFinite(cantidadNueva) || cantidadNueva < 0)
      return err(new StockNegativoError(this.ingredientId.toString(), cantidadNueva));

    const cantidadAnterior = this.cantidadDisponible;
    const nuevo = this._con({
      cantidadDisponible: cantidadNueva,
      version: this.version + 1,
      actualizadoEn: ahora,
    });

    const evento: AjusteRegistrado = {
      eventoId,
      tipo: 'AjusteRegistrado',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        movimientoId: movimientoId.toString(),
        ingredientId: this.ingredientId.toString(),
        businessUnitId: this.businessUnitId.toString(),
        cantidadAnterior,
        cantidadNueva,
        unidad: this.unidadNativa,
        motivo: motivo.trim(),
      },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  /**
   * Comprueba si el stock disponible quedó por debajo del umbral de alerta del
   * ingrediente. Si es así, emite `AlertaDeStockAbierta` con la nueva alerta.
   * No muta el aggregate: devuelve `this` con (posiblemente) un evento más.
   */
  verificarAlerta(
    umbralDeAlerta: number,
    alertaId: StockAlertId,
    ahora: FechaHora,
    eventoId: string,
  ): { stockItem: StockItem; alertaEmitida: boolean } {
    if (umbralDeAlerta <= 0 || this.cantidadDisponible >= umbralDeAlerta) {
      return { stockItem: this, alertaEmitida: false };
    }

    const nuevo = new StockItem(this._props(), []);
    const evento: AlertaDeStockAbierta = {
      eventoId,
      tipo: 'AlertaDeStockAbierta',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        alertaId: alertaId.toString(),
        ingredientId: this.ingredientId.toString(),
        businessUnitId: this.businessUnitId.toString(),
        stockActual: this.cantidadDisponible,
        umbral: umbralDeAlerta,
        unidad: this.unidadNativa,
      },
    };
    nuevo._events.push(...this._events, evento);
    return { stockItem: nuevo, alertaEmitida: true };
  }

  // ── Consultas ────────────────────────────────────────────────

  estaBajoUmbral(umbralDeAlerta: number): boolean {
    return umbralDeAlerta > 0 && this.cantidadDisponible < umbralDeAlerta;
  }

  pullDomainEvents(): InventoryDomainEvent[] {
    return [...this._events];
  }

  // ── Helpers ──────────────────────────────────────────────────

  private _props(): StockItemProps {
    return {
      id: this.id,
      ingredientId: this.ingredientId,
      businessUnitId: this.businessUnitId,
      cantidadDisponible: this.cantidadDisponible,
      unidadNativa: this.unidadNativa,
      costoPromedioUnitario: this.costoPromedioUnitario,
      version: this.version,
      actualizadoEn: this.actualizadoEn,
    };
  }

  private _con(overrides: StockItemPropsOverride): StockItem {
    return new StockItem({ ...this._props(), ...overrides }, []);
  }
}
