import { type Result, ok, err } from '../errors/DomainError.js';
import {
  RecetaSinLineasError,
  LineaDeRecetaDuplicadaError,
  LineaDeRecetaNoEncontradaError,
  IngredienteDuplicadoEnRecetaError,
  CostoIngredienteNoDisponibleError,
  CostoCeroSospechosoError,
  MoneyInvalidoError,
} from '../errors/index.js';
import { RecipeId, RecipeLineId, ProductVariantId, IngredientId } from '../value-objects/ids.js';
import { Money } from '../value-objects/Money.js';
import { FechaHora } from '../value-objects/FechaHora.js';
import { RecipeLine } from '../entities/RecipeLine.js';
import type {
  CatalogDomainEvent,
  RecetaCreadaEvent,
  RecetaActualizadaEvent,
} from '../events/index.js';

export interface RecipeProps {
  readonly id: RecipeId;
  readonly varianteId: ProductVariantId;
  readonly lineas: ReadonlyArray<RecipeLine>;
  readonly version: number;
  readonly actualizadaEn: FechaHora;
}

type CambioReceta = RecetaActualizadaEvent['payload']['cambios'][number];

/**
 * Aggregate `Receta`.
 *
 * Cada `Receta` pertenece a una `ProductVariant` (1 receta por variante).
 * `recetaId = null` en la variante indica "producto de reventa" — en ese caso
 * no existe una `Receta` asociada y el costo proviene de Inventory.
 *
 * Invariantes (cf. docs/domain-model/catalog/aggregates.md):
 *   1. lineas.length >= 1
 *   2. lineas.id únicos
 *   3. lineas.ingredientId únicos
 *   4. cantidad > 0 (delegado a `Cantidad`)
 *   5. version monotónica (incrementa en 1 por mutación)
 *
 * El cálculo de costo (`calcularCosto`) es una **consulta pura**: no muta
 * el aggregate ni emite eventos. Recibe los costos por parámetro
 * (`Map<IngredientId.toString(), Money>`) — Catalog no llama a Inventory.
 */
export class Recipe {
  readonly id: RecipeId;
  readonly varianteId: ProductVariantId;
  readonly lineas: ReadonlyArray<RecipeLine>;
  readonly version: number;
  readonly actualizadaEn: FechaHora;

  private readonly _events: CatalogDomainEvent[];

  private constructor(props: RecipeProps, events: CatalogDomainEvent[] = []) {
    this.id = props.id;
    this.varianteId = props.varianteId;
    this.lineas = props.lineas;
    this.version = props.version;
    this.actualizadaEn = props.actualizadaEn;
    this._events = events;
  }

  // ── Factoría ────────────────────────────────────────────────

  static crear(
    props: {
      id: RecipeId;
      varianteId: ProductVariantId;
      lineas: ReadonlyArray<RecipeLine>;
      ahora: FechaHora;
    },
    eventoId: string,
  ): Result<
    Recipe,
    RecetaSinLineasError | LineaDeRecetaDuplicadaError | IngredienteDuplicadoEnRecetaError
  > {
    const validacion = Recipe._validarLineas(props.id, props.lineas);
    if (!validacion.ok) return err(validacion.error);

    const receta = new Recipe(
      {
        id: props.id,
        varianteId: props.varianteId,
        lineas: props.lineas,
        version: 1,
        actualizadaEn: props.ahora,
      },
      [],
    );

    const evento: RecetaCreadaEvent = {
      eventoId,
      tipo: 'RecetaCreada',
      aggregateId: props.id.toString(),
      ocurridoEn: props.ahora.toTimestamp(),
      version: 1,
      payload: {
        recetaId: props.id.toString(),
        varianteId: props.varianteId.toString(),
        cantidadDeLineas: props.lineas.length,
        versionInicial: 1,
      },
    };
    receta._events.push(evento);
    return ok(receta);
  }

  // ── Comandos ────────────────────────────────────────────────

  agregarLinea(
    linea: RecipeLine,
    ahora: FechaHora,
    eventoId: string,
  ): Result<Recipe, LineaDeRecetaDuplicadaError | IngredienteDuplicadoEnRecetaError> {
    if (this.lineas.some((l) => l.id.equals(linea.id)))
      return err(new LineaDeRecetaDuplicadaError(linea.id.toString()));
    if (this.lineas.some((l) => l.ingredientId.equals(linea.ingredientId)))
      return err(new IngredienteDuplicadoEnRecetaError(linea.ingredientId.toString()));

    const nuevasLineas = [...this.lineas, linea];
    const cambios: ReadonlyArray<CambioReceta> = [
      {
        tipo: 'agregada',
        lineaId: linea.id.toString(),
        ingredientId: linea.ingredientId.toString(),
        cantidadValor: linea.cantidad.valor(),
        unidad: linea.cantidad.unidad(),
      },
    ];
    return ok(this._mutar(nuevasLineas, ahora, eventoId, cambios));
  }

  eliminarLinea(
    lineaId: RecipeLineId,
    ahora: FechaHora,
    eventoId: string,
  ): Result<Recipe, LineaDeRecetaNoEncontradaError | RecetaSinLineasError> {
    const linea = this.lineas.find((l) => l.id.equals(lineaId));
    if (!linea) return err(new LineaDeRecetaNoEncontradaError(lineaId.toString()));

    const nuevasLineas = this.lineas.filter((l) => !l.id.equals(lineaId));
    if (nuevasLineas.length === 0) return err(new RecetaSinLineasError(this.id.toString()));

    const cambios: ReadonlyArray<CambioReceta> = [
      {
        tipo: 'eliminada',
        lineaId: linea.id.toString(),
        ingredientId: linea.ingredientId.toString(),
      },
    ];
    return ok(this._mutar(nuevasLineas, ahora, eventoId, cambios));
  }

  actualizarLinea(
    lineaActualizada: RecipeLine,
    ahora: FechaHora,
    eventoId: string,
  ): Result<Recipe, LineaDeRecetaNoEncontradaError | IngredienteDuplicadoEnRecetaError> {
    const existe = this.lineas.some((l) => l.id.equals(lineaActualizada.id));
    if (!existe) return err(new LineaDeRecetaNoEncontradaError(lineaActualizada.id.toString()));

    const otrasLineas = this.lineas.filter((l) => !l.id.equals(lineaActualizada.id));
    if (otrasLineas.some((l) => l.ingredientId.equals(lineaActualizada.ingredientId)))
      return err(new IngredienteDuplicadoEnRecetaError(lineaActualizada.ingredientId.toString()));

    const nuevasLineas = this.lineas.map((l) =>
      l.id.equals(lineaActualizada.id) ? lineaActualizada : l,
    );

    const cambios: ReadonlyArray<CambioReceta> = [
      {
        tipo: 'actualizada',
        lineaId: lineaActualizada.id.toString(),
        ingredientId: lineaActualizada.ingredientId.toString(),
        cantidadValor: lineaActualizada.cantidad.valor(),
        unidad: lineaActualizada.cantidad.unidad(),
      },
    ];
    return ok(this._mutar(nuevasLineas, ahora, eventoId, cambios));
  }

  // ── Consultas puras ─────────────────────────────────────────

  /**
   * Calcula el costo unitario sumando, por cada línea:
   *   `costoUnitarioIngrediente × cantidad.valor()`.
   *
   * Los costos llegan ya expresados **por la unidad de la línea**: el
   * adapter ACL normaliza la unidad nativa del ingrediente antes de pasarlos.
   *
   * Si falta el costo de algún ingrediente, devuelve
   * `CostoIngredienteNoDisponibleError` con la lista de IDs faltantes.
   *
   * Si todos los costos son cero, devuelve `CostoCeroSospechosoError` para
   * advertir al caso de uso (que decide si lo permite).
   */
  calcularCosto(
    costos: ReadonlyMap<string, Money>,
  ): Result<
    Money,
    CostoIngredienteNoDisponibleError | CostoCeroSospechosoError | MoneyInvalidoError
  > {
    const faltantes: string[] = [];
    for (const linea of this.lineas) {
      if (!costos.has(linea.ingredientId.toString())) faltantes.push(linea.ingredientId.toString());
    }
    if (faltantes.length > 0) return err(new CostoIngredienteNoDisponibleError(faltantes));

    let acumulado = Money.cero();
    for (const linea of this.lineas) {
      const costoUnitario = costos.get(linea.ingredientId.toString());
      if (!costoUnitario)
        return err(new CostoIngredienteNoDisponibleError([linea.ingredientId.toString()]));

      const subtotalRes = costoUnitario.multiplicarPor(linea.cantidad.valor());
      if (!subtotalRes.ok) return err(subtotalRes.error);
      acumulado = acumulado.mas(subtotalRes.value);
    }

    if (acumulado.esCero()) return err(new CostoCeroSospechosoError(this.id.toString()));
    return ok(acumulado);
  }

  ingredientIdsRequeridos(): ReadonlyArray<IngredientId> {
    return this.lineas.map((l) => l.ingredientId);
  }

  pullDomainEvents(): CatalogDomainEvent[] {
    return [...this._events];
  }

  // ── Helpers ─────────────────────────────────────────────────

  private _mutar(
    nuevasLineas: ReadonlyArray<RecipeLine>,
    ahora: FechaHora,
    eventoId: string,
    cambios: ReadonlyArray<CambioReceta>,
  ): Recipe {
    const nuevaVersion = this.version + 1;
    const nueva = new Recipe(
      {
        id: this.id,
        varianteId: this.varianteId,
        lineas: nuevasLineas,
        version: nuevaVersion,
        actualizadaEn: ahora,
      },
      [...this._events],
    );

    const evento: RecetaActualizadaEvent = {
      eventoId,
      tipo: 'RecetaActualizada',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: nuevaVersion,
      payload: {
        recetaId: this.id.toString(),
        varianteId: this.varianteId.toString(),
        versionAnterior: this.version,
        versionNueva: nuevaVersion,
        cambios,
      },
    };
    nueva._events.push(evento);
    return nueva;
  }

  private static _validarLineas(
    recetaId: RecipeId,
    lineas: ReadonlyArray<RecipeLine>,
  ): Result<
    true,
    RecetaSinLineasError | LineaDeRecetaDuplicadaError | IngredienteDuplicadoEnRecetaError
  > {
    if (lineas.length === 0) return err(new RecetaSinLineasError(recetaId.toString()));

    const idsVistos = new Set<string>();
    for (const linea of lineas) {
      const k = linea.id.toString();
      if (idsVistos.has(k)) return err(new LineaDeRecetaDuplicadaError(k));
      idsVistos.add(k);
    }

    const ingredientesVistos = new Set<string>();
    for (const linea of lineas) {
      const k = linea.ingredientId.toString();
      if (ingredientesVistos.has(k)) return err(new IngredienteDuplicadoEnRecetaError(k));
      ingredientesVistos.add(k);
    }

    return ok(true);
  }

  static reconstituir(props: RecipeProps): Recipe {
    return new Recipe(props, []);
  }
}
