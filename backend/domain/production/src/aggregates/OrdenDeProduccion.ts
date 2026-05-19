import { type Result, ok, err, FechaHora } from '@zahavi/domain-shared-kernel';
import {
  CantidadAProducirInvalidaError,
  CantidadProducidaInvalidaError,
  BOMVacioError,
  BOMYaCalculadoError,
  BOMNoCalculadoError,
  LineaDeBOMDuplicadaError,
  IngredienteDuplicadoEnBOMError,
  TransicionDeEstadoInvalidaError,
  OrdenNoCancelableError,
  CancelacionSinJustificacionError,
  MermaFueraDeEjecucionError,
  MermaSinMotivoError,
  MermaExcedeConsumoError,
} from '../errors/index.js';
import {
  OrdenDeProduccionId,
  ProductVariantIdRef,
  RecipeIdRef,
  BusinessUnitIdRef,
  UsuarioIdRef,
  IngredientIdRef,
} from '../value-objects/ids.js';
import { EstadoDeOrdenDeProduccion } from '../value-objects/enums.js';
import { CodigoDeLote } from '../value-objects/CodigoDeLote.js';
import { LoteDeProduccion } from '../value-objects/LoteDeProduccion.js';
import { LineaDeBOM } from '../entities/LineaDeBOM.js';
import { RegistroDeMerma } from '../entities/RegistroDeMerma.js';
import type {
  ProductionDomainEvent,
  OrdenDeProduccionCreada,
  BOMCalculadoParaOrden,
  IngredientesReservadosParaOrden,
  OrdenDeProduccionIniciada,
  MermaDeProduccionRegistrada,
  OrdenDeProduccionEjecutada,
  OrdenDeProduccionCancelada,
} from '../events/index.js';

export interface OrdenDeProduccionProps {
  readonly id: OrdenDeProduccionId;
  readonly varianteId: ProductVariantIdRef;
  readonly recetaId: RecipeIdRef;
  readonly plantaCentralId: BusinessUnitIdRef;
  readonly cantidadAProducir: number;
  readonly estado: EstadoDeOrdenDeProduccion;
  readonly bom: ReadonlyArray<LineaDeBOM>;
  readonly mermas: ReadonlyArray<RegistroDeMerma>;
  readonly lote: LoteDeProduccion | null;
  readonly creadaPor: UsuarioIdRef;
  readonly creadaEn: FechaHora;
}

type OrdenDeProduccionPropsOverride = Partial<
  Pick<OrdenDeProduccionProps, 'estado' | 'bom' | 'mermas' | 'lote'>
>;

/**
 * Aggregate root `OrdenDeProduccion`.
 *
 * Representa el compromiso operativo de fabricar N unidades de una variante
 * en la planta central. Gobierna su BOM (Bill of Materials), las mermas
 * registradas durante la ejecución y el lote producido.
 *
 * Invariantes (cf. docs/domain-model/production/aggregates.md):
 *   1. `cantidadAProducir` es entero > 0.
 *   2. Transiciones de estado válidas (cf. `EstadoDeOrdenDeProduccion`):
 *      PLANIFICADA → RESERVADA → EN_EJECUCION → EJECUTADA;
 *      PLANIFICADA | RESERVADA → CANCELADA.
 *      Ningún estado vuelve atrás.
 *   3. Una vez calculado, `bom.length >= 1`.
 *   4. IDs de líneas de BOM únicos.
 *   5. `ingredientId` únicos dentro del BOM.
 *   6. Solo se registran mermas en estado EN_EJECUCION.
 *   7. La merma de un ingrediente no excede la cantidad requerida en el BOM
 *      para ese ingrediente.
 *   8. `cantidadProducida` del lote es entero positivo y `<= cantidadAProducir`.
 *   9. El BOM se calcula UNA sola vez (no se recalcula).
 *
 * El consumo real de stock NO ocurre dentro del aggregate. Al ejecutarse,
 * la OdP emite `OrdenDeProduccionEjecutada` con el `consumoReal` (BOM menos
 * merma reportada por ingrediente). El caso de uso aplicación coordina los
 * movimientos en Inventory de forma eventual.
 */
export class OrdenDeProduccion {
  readonly id: OrdenDeProduccionId;
  readonly varianteId: ProductVariantIdRef;
  readonly recetaId: RecipeIdRef;
  readonly plantaCentralId: BusinessUnitIdRef;
  readonly cantidadAProducir: number;
  readonly estado: EstadoDeOrdenDeProduccion;
  readonly bom: ReadonlyArray<LineaDeBOM>;
  readonly mermas: ReadonlyArray<RegistroDeMerma>;
  readonly lote: LoteDeProduccion | null;
  readonly creadaPor: UsuarioIdRef;
  readonly creadaEn: FechaHora;

  private readonly _events: ProductionDomainEvent[];

  private constructor(props: OrdenDeProduccionProps, events: ProductionDomainEvent[] = []) {
    this.id = props.id;
    this.varianteId = props.varianteId;
    this.recetaId = props.recetaId;
    this.plantaCentralId = props.plantaCentralId;
    this.cantidadAProducir = props.cantidadAProducir;
    this.estado = props.estado;
    this.bom = props.bom;
    this.mermas = props.mermas;
    this.lote = props.lote;
    this.creadaPor = props.creadaPor;
    this.creadaEn = props.creadaEn;
    this._events = events;
  }

  // ── Factoría ────────────────────────────────────────────────

  /**
   * Crea una orden en estado PLANIFICADA. El BOM se asocia después con
   * `calcularBOM()` porque proviene de Catalog vía ACL.
   */
  static crear(
    props: {
      id: OrdenDeProduccionId;
      varianteId: ProductVariantIdRef;
      recetaId: RecipeIdRef;
      plantaCentralId: BusinessUnitIdRef;
      cantidadAProducir: number;
      creadaPor: UsuarioIdRef;
      ahora: FechaHora;
    },
    eventoId: string,
  ): Result<OrdenDeProduccion, CantidadAProducirInvalidaError> {
    // Invariante 1: cantidadAProducir entero > 0
    if (!Number.isInteger(props.cantidadAProducir) || props.cantidadAProducir <= 0) {
      return err(new CantidadAProducirInvalidaError(props.cantidadAProducir));
    }

    const orden = new OrdenDeProduccion(
      {
        id: props.id,
        varianteId: props.varianteId,
        recetaId: props.recetaId,
        plantaCentralId: props.plantaCentralId,
        cantidadAProducir: props.cantidadAProducir,
        estado: EstadoDeOrdenDeProduccion.PLANIFICADA,
        bom: [],
        mermas: [],
        lote: null,
        creadaPor: props.creadaPor,
        creadaEn: props.ahora,
      },
      [],
    );

    const evento: OrdenDeProduccionCreada = {
      eventoId,
      tipo: 'OrdenDeProduccionCreada',
      aggregateId: props.id.toString(),
      ocurridoEn: props.ahora.toTimestamp(),
      version: 1,
      payload: {
        ordenId: props.id.toString(),
        varianteId: props.varianteId.toString(),
        recetaId: props.recetaId.toString(),
        plantaCentralId: props.plantaCentralId.toString(),
        cantidadAProducir: props.cantidadAProducir,
        creadaPor: props.creadaPor.toString(),
      },
    };
    orden._events.push(evento);
    return ok(orden);
  }

  // ── Comandos ────────────────────────────────────────────────

  /**
   * Adjunta el BOM (calculado por el caso de uso a partir de la receta del
   * BC Catalog, escalada por `cantidadAProducir`). Solo es posible en
   * PLANIFICADA y exactamente una vez (no se recalcula).
   */
  calcularBOM(
    lineas: ReadonlyArray<LineaDeBOM>,
    ahora: FechaHora,
    eventoId: string,
  ): Result<
    OrdenDeProduccion,
    | TransicionDeEstadoInvalidaError
    | BOMYaCalculadoError
    | BOMVacioError
    | LineaDeBOMDuplicadaError
    | IngredienteDuplicadoEnBOMError
  > {
    if (this.estado !== EstadoDeOrdenDeProduccion.PLANIFICADA)
      return err(
        new TransicionDeEstadoInvalidaError(this.id.toString(), this.estado, 'calcular_bom'),
      );

    // Invariante 9: BOM se calcula una sola vez
    if (this.bom.length > 0) return err(new BOMYaCalculadoError(this.id.toString()));

    // Invariante 3-5: validación del BOM entrante
    const validacion = OrdenDeProduccion._validarBOM(this.id, lineas);
    if (!validacion.ok) return err(validacion.error);

    const nueva = this._con({ bom: lineas });
    const evento: BOMCalculadoParaOrden = {
      eventoId,
      tipo: 'BOMCalculadoParaOrden',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        ordenId: this.id.toString(),
        lineas: lineas.map((l) => ({
          lineaId: l.id.toString(),
          ingredientId: l.ingredientId.toString(),
          cantidadRequerida: l.cantidadRequerida.valor(),
          unidad: l.cantidadRequerida.unidad(),
        })),
      },
    };
    nueva._events.push(...this._events, evento);
    return ok(nueva);
  }

  /**
   * Marca la orden como RESERVADA. Requiere BOM ya calculado. Anuncia a
   * Inventory que debe apartar los ingredientes (consistencia eventual).
   * NO descuenta stock: eso ocurre al ejecutar.
   */
  reservarIngredientes(
    ahora: FechaHora,
    eventoId: string,
  ): Result<OrdenDeProduccion, TransicionDeEstadoInvalidaError | BOMNoCalculadoError> {
    if (this.estado !== EstadoDeOrdenDeProduccion.PLANIFICADA)
      return err(
        new TransicionDeEstadoInvalidaError(
          this.id.toString(),
          this.estado,
          EstadoDeOrdenDeProduccion.RESERVADA,
        ),
      );
    if (this.bom.length === 0) return err(new BOMNoCalculadoError(this.id.toString()));

    const nueva = this._con({ estado: EstadoDeOrdenDeProduccion.RESERVADA });
    const evento: IngredientesReservadosParaOrden = {
      eventoId,
      tipo: 'IngredientesReservadosParaOrden',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        ordenId: this.id.toString(),
        plantaCentralId: this.plantaCentralId.toString(),
        lineas: this.bom.map((l) => ({
          ingredientId: l.ingredientId.toString(),
          cantidadReservada: l.cantidadRequerida.valor(),
          unidad: l.cantidadRequerida.unidad(),
        })),
      },
    };
    nueva._events.push(...this._events, evento);
    return ok(nueva);
  }

  /**
   * Transición RESERVADA → EN_EJECUCION. Marca el inicio de la producción
   * física.
   */
  iniciar(
    iniciadaPor: UsuarioIdRef,
    ahora: FechaHora,
    eventoId: string,
  ): Result<OrdenDeProduccion, TransicionDeEstadoInvalidaError> {
    if (this.estado !== EstadoDeOrdenDeProduccion.RESERVADA)
      return err(
        new TransicionDeEstadoInvalidaError(
          this.id.toString(),
          this.estado,
          EstadoDeOrdenDeProduccion.EN_EJECUCION,
        ),
      );

    const nueva = this._con({ estado: EstadoDeOrdenDeProduccion.EN_EJECUCION });
    const evento: OrdenDeProduccionIniciada = {
      eventoId,
      tipo: 'OrdenDeProduccionIniciada',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        ordenId: this.id.toString(),
        iniciadaPor: iniciadaPor.toString(),
      },
    };
    nueva._events.push(...this._events, evento);
    return ok(nueva);
  }

  /**
   * Registra una merma. Solo válido en EN_EJECUCION (invariante 6).
   * La merma de un ingrediente no puede exceder el total requerido por el
   * BOM para ese ingrediente, considerando mermas ya registradas
   * (invariante 7).
   */
  registrarMerma(
    merma: RegistroDeMerma,
  ): Result<
    OrdenDeProduccion,
    MermaFueraDeEjecucionError | MermaSinMotivoError | MermaExcedeConsumoError
  > {
    // Invariante 6: solo EN_EJECUCION
    if (this.estado !== EstadoDeOrdenDeProduccion.EN_EJECUCION)
      return err(new MermaFueraDeEjecucionError(this.id.toString(), this.estado));

    // Defensa en profundidad: motivo no vacío (RegistroDeMerma.crear ya lo valida,
    // pero protegemos el aggregate por si llega ya reconstituido).
    if (merma.motivo.trim().length === 0) return err(new MermaSinMotivoError());

    // Invariante 7: merma <= consumo máximo (cantidad del BOM para el ingrediente)
    const lineaBOM = this.bom.find((l) => l.ingredientId.equals(merma.ingredientId));
    if (lineaBOM) {
      const mermaPrevia = this.mermas
        .filter((m) => m.ingredientId.equals(merma.ingredientId))
        .reduce((acc, m) => acc + m.cantidad.valor(), 0);
      const total = mermaPrevia + merma.cantidad.valor();
      if (total > lineaBOM.cantidadRequerida.valor()) {
        return err(
          new MermaExcedeConsumoError(
            merma.ingredientId.toString(),
            total,
            lineaBOM.cantidadRequerida.valor(),
          ),
        );
      }
    }

    const nueva = this._con({ mermas: [...this.mermas, merma] });
    const evento: MermaDeProduccionRegistrada = {
      eventoId: merma.id.toString(),
      tipo: 'MermaDeProduccionRegistrada',
      aggregateId: this.id.toString(),
      ocurridoEn: merma.registradaEn.toTimestamp(),
      version: 1,
      payload: {
        ordenId: this.id.toString(),
        mermaId: merma.id.toString(),
        ingredientId: merma.ingredientId.toString(),
        cantidad: merma.cantidad.valor(),
        unidad: merma.cantidad.unidad(),
        motivo: merma.motivo,
        registradaPor: merma.registradaPor.toString(),
      },
    };
    nueva._events.push(...this._events, evento);
    return ok(nueva);
  }

  /**
   * Cierra la orden: produce el `LoteDeProduccion` y emite
   * `OrdenDeProduccionEjecutada` con el `consumoReal` por ingrediente
   * (BOM menos merma reportada). Solo válido en EN_EJECUCION.
   *
   * Invariante 8: `cantidadProducida` entero > 0 y <= `cantidadAProducir`.
   */
  ejecutar(
    cantidadProducida: number,
    codigoLote: CodigoDeLote,
    ejecutadaPor: UsuarioIdRef,
    ahora: FechaHora,
    eventoId: string,
  ): Result<OrdenDeProduccion, TransicionDeEstadoInvalidaError | CantidadProducidaInvalidaError> {
    if (this.estado !== EstadoDeOrdenDeProduccion.EN_EJECUCION)
      return err(
        new TransicionDeEstadoInvalidaError(
          this.id.toString(),
          this.estado,
          EstadoDeOrdenDeProduccion.EJECUTADA,
        ),
      );

    // Invariante 8
    if (
      !Number.isInteger(cantidadProducida) ||
      cantidadProducida <= 0 ||
      cantidadProducida > this.cantidadAProducir
    ) {
      return err(new CantidadProducidaInvalidaError(cantidadProducida, this.cantidadAProducir));
    }

    const lote = LoteDeProduccion.crear(codigoLote, cantidadProducida, ahora);

    // Consumo real por ingrediente = cantidad del BOM - merma de ese ingrediente.
    // Si todo el BOM se consumió SIN merma, consumoReal = cantidad del BOM.
    const mermaPorIngrediente = new Map<string, number>();
    for (const m of this.mermas) {
      const k = m.ingredientId.toString();
      mermaPorIngrediente.set(k, (mermaPorIngrediente.get(k) ?? 0) + m.cantidad.valor());
    }
    const consumoReal = this.bom.map((l) => {
      const k = l.ingredientId.toString();
      const merma = mermaPorIngrediente.get(k) ?? 0;
      const consumido = l.cantidadRequerida.valor() - merma;
      return {
        ingredientId: k,
        cantidadConsumida: consumido,
        unidad: l.cantidadRequerida.unidad(),
      };
    });

    const nueva = this._con({
      estado: EstadoDeOrdenDeProduccion.EJECUTADA,
      lote,
    });
    const evento: OrdenDeProduccionEjecutada = {
      eventoId,
      tipo: 'OrdenDeProduccionEjecutada',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        ordenId: this.id.toString(),
        varianteId: this.varianteId.toString(),
        plantaCentralId: this.plantaCentralId.toString(),
        cantidadPlaneada: this.cantidadAProducir,
        cantidadProducida,
        codigoLote: codigoLote.toString(),
        consumoReal,
        ejecutadaPor: ejecutadaPor.toString(),
      },
    };
    nueva._events.push(...this._events, evento);
    return ok(nueva);
  }

  /**
   * Cancela la orden. Solo válido en PLANIFICADA o RESERVADA (en
   * EN_EJECUCION ya hay consumo físico; en EJECUTADA es terminal).
   */
  cancelar(
    motivo: string,
    canceladaPor: UsuarioIdRef,
    ahora: FechaHora,
    eventoId: string,
  ): Result<OrdenDeProduccion, OrdenNoCancelableError | CancelacionSinJustificacionError> {
    if (motivo.trim().length === 0) return err(new CancelacionSinJustificacionError());

    if (
      this.estado !== EstadoDeOrdenDeProduccion.PLANIFICADA &&
      this.estado !== EstadoDeOrdenDeProduccion.RESERVADA
    ) {
      return err(new OrdenNoCancelableError(this.id.toString(), this.estado));
    }

    const estadoAnterior = this.estado;
    const nueva = this._con({ estado: EstadoDeOrdenDeProduccion.CANCELADA });
    const evento: OrdenDeProduccionCancelada = {
      eventoId,
      tipo: 'OrdenDeProduccionCancelada',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        ordenId: this.id.toString(),
        motivo: motivo.trim(),
        canceladaPor: canceladaPor.toString(),
        estadoAnterior,
      },
    };
    nueva._events.push(...this._events, evento);
    return ok(nueva);
  }

  // ── Consultas ───────────────────────────────────────────────

  mermaTotalDeIngrediente(ingredientId: IngredientIdRef): number {
    return this.mermas
      .filter((m) => m.ingredientId.equals(ingredientId))
      .reduce((acc, m) => acc + m.cantidad.valor(), 0);
  }

  /**
   * Devuelve la línea de BOM correspondiente al ingrediente, o null si el
   * ingrediente no está en el BOM.
   */
  lineaDeBOMPara(ingredientId: IngredientIdRef): LineaDeBOM | null {
    return this.bom.find((l) => l.ingredientId.equals(ingredientId)) ?? null;
  }

  esTerminal(): boolean {
    return (
      this.estado === EstadoDeOrdenDeProduccion.EJECUTADA ||
      this.estado === EstadoDeOrdenDeProduccion.CANCELADA
    );
  }

  pullDomainEvents(): ProductionDomainEvent[] {
    return [...this._events];
  }

  // ── Helpers privados ────────────────────────────────────────

  private _props(): OrdenDeProduccionProps {
    return {
      id: this.id,
      varianteId: this.varianteId,
      recetaId: this.recetaId,
      plantaCentralId: this.plantaCentralId,
      cantidadAProducir: this.cantidadAProducir,
      estado: this.estado,
      bom: this.bom,
      mermas: this.mermas,
      lote: this.lote,
      creadaPor: this.creadaPor,
      creadaEn: this.creadaEn,
    };
  }

  private _con(overrides: OrdenDeProduccionPropsOverride): OrdenDeProduccion {
    return new OrdenDeProduccion({ ...this._props(), ...overrides }, []);
  }

  // ── Validación del BOM ──────────────────────────────────────

  private static _validarBOM(
    ordenId: OrdenDeProduccionId,
    lineas: ReadonlyArray<LineaDeBOM>,
  ): Result<true, BOMVacioError | LineaDeBOMDuplicadaError | IngredienteDuplicadoEnBOMError> {
    if (lineas.length === 0) return err(new BOMVacioError(ordenId.toString()));

    const idsVistos = new Set<string>();
    for (const l of lineas) {
      const k = l.id.toString();
      if (idsVistos.has(k)) return err(new LineaDeBOMDuplicadaError(k));
      idsVistos.add(k);
    }

    const ingredientesVistos = new Set<string>();
    for (const l of lineas) {
      const k = l.ingredientId.toString();
      if (ingredientesVistos.has(k)) return err(new IngredienteDuplicadoEnBOMError(k));
      ingredientesVistos.add(k);
    }

    return ok(true);
  }

  // ── Reconstrucción desde persistencia ───────────────────────

  static reconstituir(props: OrdenDeProduccionProps): OrdenDeProduccion {
    return new OrdenDeProduccion(props, []);
  }
}
