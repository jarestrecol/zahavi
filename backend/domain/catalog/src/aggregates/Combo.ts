import { type Result, ok, err } from '../errors/DomainError.js';
import {
  ComboSinItemsError,
  ItemDeComboDuplicadoError,
  ItemDeComboNoEncontradoError,
  VarianteDuplicadaEnComboError,
  ComboYaEnEstadoError,
  VigenciaInvalidaError,
} from '../errors/index.js';
import { ComboId, ComboItemId } from '../value-objects/ids.js';
import { NombreDeCatalogo } from '../value-objects/NombreDeCatalogo.js';
import { Money } from '../value-objects/Money.js';
import { FechaHora } from '../value-objects/FechaHora.js';
import type { EstadoDeCombo } from '../value-objects/enums.js';
import { ComboItem } from '../entities/ComboItem.js';
import type {
  CatalogDomainEvent,
  ComboCreadoEvent,
  ComboActivadoEvent,
  ComboDesactivadoEvent,
  ItemAgregadoAlComboEvent,
  ItemEliminadoDelComboEvent,
  PrecioDeComboCambiadoEvent,
  VigenciaDeComboCambiadaEvent,
} from '../events/index.js';

export interface ComboProps {
  readonly id: ComboId;
  readonly nombre: NombreDeCatalogo;
  readonly descripcion: string;
  readonly imagenUrl: string | null;
  readonly precio: Money;
  readonly items: ReadonlyArray<ComboItem>;
  readonly estado: EstadoDeCombo;
  readonly vigenciaDesde: FechaHora | null;
  readonly vigenciaHasta: FechaHora | null;
  readonly creadoEn: FechaHora;
}

/**
 * Aggregate root `Combo`.
 *
 * Invariantes (cf. docs/domain-model/catalog/aggregates.md):
 *   1. items.length >= 1
 *   2. ids de items únicos en el aggregate
 *   3. productVariantId único entre items (para "2 cafés" usar cantidad=2)
 *   4. precio >= 0 (delegado a `Money`)
 *   5. inactivo no es vendible (verificado en BC Sales)
 *   6. cantidad > 0 por item (delegado a `Cantidad`)
 *   7. vigenciaDesde <= vigenciaHasta cuando ambos están presentes
 *
 * Vigencia:
 *   - ambos null → combo siempre activo (sin restricción temporal)
 *   - solo vigenciaDesde → disponible a partir de esa fecha, sin fin
 *   - solo vigenciaHasta → disponible hasta esa fecha, desde siempre
 *   - ambos presentes → vigenciaDesde debe ser <= vigenciaHasta
 */
export class Combo {
  readonly id: ComboId;
  readonly nombre: NombreDeCatalogo;
  readonly descripcion: string;
  readonly imagenUrl: string | null;
  readonly precio: Money;
  readonly items: ReadonlyArray<ComboItem>;
  readonly estado: EstadoDeCombo;
  readonly vigenciaDesde: FechaHora | null;
  readonly vigenciaHasta: FechaHora | null;
  readonly creadoEn: FechaHora;

  private readonly _events: CatalogDomainEvent[];

  private constructor(props: ComboProps, events: CatalogDomainEvent[] = []) {
    this.id = props.id;
    this.nombre = props.nombre;
    this.descripcion = props.descripcion;
    this.imagenUrl = props.imagenUrl;
    this.precio = props.precio;
    this.items = props.items;
    this.estado = props.estado;
    this.vigenciaDesde = props.vigenciaDesde;
    this.vigenciaHasta = props.vigenciaHasta;
    this.creadoEn = props.creadoEn;
    this._events = events;
  }

  // ── Factoría ────────────────────────────────────────────────

  static crear(
    props: {
      id: ComboId;
      nombre: NombreDeCatalogo;
      descripcion: string;
      imagenUrl: string | null;
      precio: Money;
      items: ReadonlyArray<ComboItem>;
      vigenciaDesde: FechaHora | null;
      vigenciaHasta: FechaHora | null;
      ahora: FechaHora;
    },
    eventoId: string,
  ): Result<
    Combo,
    | ComboSinItemsError
    | ItemDeComboDuplicadoError
    | VarianteDuplicadaEnComboError
    | VigenciaInvalidaError
  > {
    const vigenciaRes = Combo._validarVigencia(props.id, props.vigenciaDesde, props.vigenciaHasta);
    if (!vigenciaRes.ok) return err(vigenciaRes.error);

    const itemsRes = Combo._validarItems(props.id, props.items);
    if (!itemsRes.ok) return err(itemsRes.error);

    const combo = new Combo(
      {
        id: props.id,
        nombre: props.nombre,
        descripcion: props.descripcion,
        imagenUrl: props.imagenUrl,
        precio: props.precio,
        items: props.items,
        estado: 'activo',
        vigenciaDesde: props.vigenciaDesde,
        vigenciaHasta: props.vigenciaHasta,
        creadoEn: props.ahora,
      },
      [],
    );

    const evento: ComboCreadoEvent = {
      eventoId,
      tipo: 'ComboCreado',
      aggregateId: props.id.toString(),
      ocurridoEn: props.ahora.toTimestamp(),
      version: 1,
      payload: {
        comboId: props.id.toString(),
        nombre: props.nombre.toString(),
        precioCop: props.precio.toCop(),
        cantidadDeItems: props.items.length,
        estado: 'activo',
      },
    };
    combo._events.push(evento);
    return ok(combo);
  }

  // ── Comandos ────────────────────────────────────────────────

  agregarItem(
    item: ComboItem,
    ahora: FechaHora,
    eventoId: string,
  ): Result<Combo, ItemDeComboDuplicadoError | VarianteDuplicadaEnComboError> {
    if (this.items.some((i) => i.id.equals(item.id)))
      return err(new ItemDeComboDuplicadoError(item.id.toString()));
    if (this.items.some((i) => i.productVariantId.equals(item.productVariantId)))
      return err(new VarianteDuplicadaEnComboError(item.productVariantId.toString()));

    const nuevo = this._con({ items: [...this.items, item] });
    const evento: ItemAgregadoAlComboEvent = {
      eventoId,
      tipo: 'ItemAgregadoAlCombo',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        comboId: this.id.toString(),
        itemId: item.id.toString(),
        productVariantId: item.productVariantId.toString(),
        cantidadValor: item.cantidad.valor(),
        unidad: item.cantidad.unidad(),
      },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  eliminarItem(
    itemId: ComboItemId,
    ahora: FechaHora,
    eventoId: string,
  ): Result<Combo, ItemDeComboNoEncontradoError | ComboSinItemsError> {
    if (!this.items.some((i) => i.id.equals(itemId)))
      return err(new ItemDeComboNoEncontradoError(itemId.toString()));

    const nuevosItems = this.items.filter((i) => !i.id.equals(itemId));
    if (nuevosItems.length === 0) return err(new ComboSinItemsError(this.id.toString()));

    const nuevo = this._con({ items: nuevosItems });
    const evento: ItemEliminadoDelComboEvent = {
      eventoId,
      tipo: 'ItemEliminadoDelCombo',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        comboId: this.id.toString(),
        itemId: itemId.toString(),
      },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  cambiarPrecio(nuevoPrecio: Money, ahora: FechaHora, eventoId: string): Combo {
    const nuevo = this._con({ precio: nuevoPrecio });
    const evento: PrecioDeComboCambiadoEvent = {
      eventoId,
      tipo: 'PrecioDeComboCambiado',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        comboId: this.id.toString(),
        precioAnteriorCop: this.precio.toCop(),
        precioNuevoCop: nuevoPrecio.toCop(),
      },
    };
    nuevo._events.push(...this._events, evento);
    return nuevo;
  }

  cambiarVigencia(
    vigenciaDesde: FechaHora | null,
    vigenciaHasta: FechaHora | null,
    ahora: FechaHora,
    eventoId: string,
  ): Result<Combo, VigenciaInvalidaError> {
    const validacion = Combo._validarVigencia(this.id, vigenciaDesde, vigenciaHasta);
    if (!validacion.ok) return err(validacion.error);

    const nuevo = this._con({ vigenciaDesde, vigenciaHasta });
    const evento: VigenciaDeComboCambiadaEvent = {
      eventoId,
      tipo: 'VigenciaDeComboCambiada',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        comboId: this.id.toString(),
        vigenciaDesdeMs: vigenciaDesde?.toTimestamp() ?? null,
        vigenciaHastaMs: vigenciaHasta?.toTimestamp() ?? null,
      },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  cambiarNombre(nuevoNombre: NombreDeCatalogo): Combo {
    return this._con({ nombre: nuevoNombre });
  }

  cambiarDescripcion(nuevaDescripcion: string): Combo {
    return this._con({ descripcion: nuevaDescripcion });
  }

  cambiarImagen(nuevaImagenUrl: string | null): Combo {
    return this._con({ imagenUrl: nuevaImagenUrl });
  }

  activar(ahora: FechaHora, eventoId: string): Result<Combo, ComboYaEnEstadoError> {
    if (this.estado === 'activo')
      return err(new ComboYaEnEstadoError(this.id.toString(), 'activo'));

    const nuevo = this._con({ estado: 'activo' });
    const evento: ComboActivadoEvent = {
      eventoId,
      tipo: 'ComboActivado',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        comboId: this.id.toString(),
      },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  desactivar(ahora: FechaHora, eventoId: string): Result<Combo, ComboYaEnEstadoError> {
    if (this.estado === 'inactivo')
      return err(new ComboYaEnEstadoError(this.id.toString(), 'inactivo'));

    const nuevo = this._con({ estado: 'inactivo' });
    const evento: ComboDesactivadoEvent = {
      eventoId,
      tipo: 'ComboDesactivado',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        comboId: this.id.toString(),
      },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  // ── Consultas puras ─────────────────────────────────────────

  esVendible(): boolean {
    return this.estado === 'activo' && this.items.length > 0;
  }

  /**
   * Verifica si el combo está dentro de su ventana de vigencia temporal.
   * Si `esVendible()` es false, el combo no se puede vender independientemente
   * de la vigencia.
   */
  estaVigenteEn(ahora: FechaHora): boolean {
    if (this.vigenciaDesde !== null && ahora.isBefore(this.vigenciaDesde)) return false;
    if (this.vigenciaHasta !== null && ahora.isAfter(this.vigenciaHasta)) return false;
    return true;
  }

  pullDomainEvents(): CatalogDomainEvent[] {
    return [...this._events];
  }

  // ── Helpers ─────────────────────────────────────────────────

  private _props(): ComboProps {
    return {
      id: this.id,
      nombre: this.nombre,
      descripcion: this.descripcion,
      imagenUrl: this.imagenUrl,
      precio: this.precio,
      items: this.items,
      estado: this.estado,
      vigenciaDesde: this.vigenciaDesde,
      vigenciaHasta: this.vigenciaHasta,
      creadoEn: this.creadoEn,
    };
  }

  private _con(overrides: ComboPropsOverride): Combo {
    return new Combo({ ...this._props(), ...overrides }, []);
  }

  private static _validarVigencia(
    comboId: ComboId,
    desde: FechaHora | null,
    hasta: FechaHora | null,
  ): Result<true, VigenciaInvalidaError> {
    if (desde !== null && hasta !== null && desde.isAfter(hasta))
      return err(new VigenciaInvalidaError(comboId.toString()));
    return ok(true);
  }

  private static _validarItems(
    comboId: ComboId,
    items: ReadonlyArray<ComboItem>,
  ): Result<true, ComboSinItemsError | ItemDeComboDuplicadoError | VarianteDuplicadaEnComboError> {
    if (items.length === 0) return err(new ComboSinItemsError(comboId.toString()));

    const idsVistos = new Set<string>();
    for (const item of items) {
      const k = item.id.toString();
      if (idsVistos.has(k)) return err(new ItemDeComboDuplicadoError(k));
      idsVistos.add(k);
    }

    const variantesVistas = new Set<string>();
    for (const item of items) {
      const k = item.productVariantId.toString();
      if (variantesVistas.has(k)) return err(new VarianteDuplicadaEnComboError(k));
      variantesVistas.add(k);
    }

    return ok(true);
  }

  static reconstituir(props: ComboProps): Combo {
    return new Combo(props, []);
  }
}

type ComboPropsOverride =
  | { readonly nombre: NombreDeCatalogo }
  | { readonly descripcion: string }
  | { readonly imagenUrl: string | null }
  | { readonly precio: Money }
  | { readonly items: ReadonlyArray<ComboItem> }
  | { readonly estado: EstadoDeCombo }
  | { readonly vigenciaDesde: FechaHora | null; readonly vigenciaHasta: FechaHora | null };
