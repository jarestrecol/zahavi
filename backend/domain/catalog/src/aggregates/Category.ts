import { type Result, ok, err } from '../errors/DomainError.js';
import {
  AutoReferenciaDeCategoriaError,
  CategoriaYaEnEstadoError,
  OrdenInvalidoError,
} from '../errors/index.js';
import { CategoryId } from '../value-objects/ids.js';
import { NombreDeCatalogo } from '../value-objects/NombreDeCatalogo.js';
import { FechaHora } from '../value-objects/FechaHora.js';
import type { EstadoDeCategoria } from '../value-objects/enums.js';
import type {
  CatalogDomainEvent,
  CategoriaCreadaEvent,
  NombreDeCategoriaCambiadoEvent,
  OrdenDeCategoriaCambiadoEvent,
  PadreDeCategoriaCambiadoEvent,
  CategoriaArchivadaEvent,
  CategoriaRestauradaEvent,
} from '../events/index.js';

export interface CategoryProps {
  readonly id: CategoryId;
  readonly nombre: NombreDeCatalogo;
  readonly padreId: CategoryId | null;
  readonly orden: number;
  readonly estado: EstadoDeCategoria;
}

/**
 * Aggregate root `Categoria`.
 *
 * Invariantes (cf. docs/domain-model/catalog/aggregates.md):
 *   1. orden >= 0 y entero
 *   2. padreId !== id (sin auto-referencia)
 *   3. profundidad <= 3 (validado en caso de uso)
 *   4. archivar/eliminar exige no tener productos activos (validado en caso
 *      de uso)
 *
 * El aggregate aislado solo conoce su propio padre directo. La verificación
 * de profundidad y la prohibición de ciclos se hace en el caso de uso vía
 * repositorio.
 */
export class Category {
  readonly id: CategoryId;
  readonly nombre: NombreDeCatalogo;
  readonly padreId: CategoryId | null;
  readonly orden: number;
  readonly estado: EstadoDeCategoria;

  private readonly _events: CatalogDomainEvent[];

  private constructor(props: CategoryProps, events: CatalogDomainEvent[] = []) {
    this.id = props.id;
    this.nombre = props.nombre;
    this.padreId = props.padreId;
    this.orden = props.orden;
    this.estado = props.estado;
    this._events = events;
  }

  // ── Factoría ────────────────────────────────────────────────

  static crear(
    props: {
      id: CategoryId;
      nombre: NombreDeCatalogo;
      padreId: CategoryId | null;
      orden: number;
      ahora: FechaHora;
    },
    eventoId: string,
  ): Result<Category, OrdenInvalidoError | AutoReferenciaDeCategoriaError> {
    if (!Number.isInteger(props.orden) || props.orden < 0)
      return err(new OrdenInvalidoError(props.orden));

    if (props.padreId !== null && props.padreId.equals(props.id))
      return err(new AutoReferenciaDeCategoriaError(props.id.toString()));

    const categoria = new Category(
      {
        id: props.id,
        nombre: props.nombre,
        padreId: props.padreId,
        orden: props.orden,
        estado: 'activa',
      },
      [],
    );

    const evento: CategoriaCreadaEvent = {
      eventoId,
      tipo: 'CategoriaCreada',
      aggregateId: props.id.toString(),
      ocurridoEn: props.ahora.toTimestamp(),
      version: 1,
      payload: {
        categoriaId: props.id.toString(),
        nombre: props.nombre.toString(),
        padreId: props.padreId?.toString() ?? null,
        orden: props.orden,
      },
    };
    categoria._events.push(evento);
    return ok(categoria);
  }

  // ── Comandos ────────────────────────────────────────────────

  cambiarNombre(nuevoNombre: NombreDeCatalogo, ahora: FechaHora, eventoId: string): Category {
    const nueva = this._con({ nombre: nuevoNombre });
    const evento: NombreDeCategoriaCambiadoEvent = {
      eventoId,
      tipo: 'NombreDeCategoriaCambiado',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        categoriaId: this.id.toString(),
        nombreAnterior: this.nombre.toString(),
        nombreNuevo: nuevoNombre.toString(),
      },
    };
    nueva._events.push(...this._events, evento);
    return nueva;
  }

  cambiarOrden(
    nuevoOrden: number,
    ahora: FechaHora,
    eventoId: string,
  ): Result<Category, OrdenInvalidoError> {
    if (!Number.isInteger(nuevoOrden) || nuevoOrden < 0)
      return err(new OrdenInvalidoError(nuevoOrden));

    const nueva = this._con({ orden: nuevoOrden });
    const evento: OrdenDeCategoriaCambiadoEvent = {
      eventoId,
      tipo: 'OrdenDeCategoriaCambiado',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        categoriaId: this.id.toString(),
        ordenAnterior: this.orden,
        ordenNuevo: nuevoOrden,
      },
    };
    nueva._events.push(...this._events, evento);
    return ok(nueva);
  }

  cambiarPadre(
    nuevoPadreId: CategoryId | null,
    ahora: FechaHora,
    eventoId: string,
  ): Result<Category, AutoReferenciaDeCategoriaError> {
    if (nuevoPadreId !== null && nuevoPadreId.equals(this.id))
      return err(new AutoReferenciaDeCategoriaError(this.id.toString()));

    const nueva = this._con({ padreId: nuevoPadreId });
    const evento: PadreDeCategoriaCambiadoEvent = {
      eventoId,
      tipo: 'PadreDeCategoriaCambiado',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        categoriaId: this.id.toString(),
        padreAnteriorId: this.padreId?.toString() ?? null,
        padreNuevoId: nuevoPadreId?.toString() ?? null,
      },
    };
    nueva._events.push(...this._events, evento);
    return ok(nueva);
  }

  archivar(ahora: FechaHora, eventoId: string): Result<Category, CategoriaYaEnEstadoError> {
    if (this.estado === 'archivada')
      return err(new CategoriaYaEnEstadoError(this.id.toString(), 'archivada'));

    const nueva = this._con({ estado: 'archivada' });
    const evento: CategoriaArchivadaEvent = {
      eventoId,
      tipo: 'CategoriaArchivada',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        categoriaId: this.id.toString(),
        estadoAnterior: this.estado,
      },
    };
    nueva._events.push(...this._events, evento);
    return ok(nueva);
  }

  restaurar(ahora: FechaHora, eventoId: string): Result<Category, CategoriaYaEnEstadoError> {
    if (this.estado === 'activa')
      return err(new CategoriaYaEnEstadoError(this.id.toString(), 'activa'));

    const nueva = this._con({ estado: 'activa' });
    const evento: CategoriaRestauradaEvent = {
      eventoId,
      tipo: 'CategoriaRestaurada',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        categoriaId: this.id.toString(),
      },
    };
    nueva._events.push(...this._events, evento);
    return ok(nueva);
  }

  pullDomainEvents(): CatalogDomainEvent[] {
    return [...this._events];
  }

  // ── Helpers ─────────────────────────────────────────────────

  private _props(): CategoryProps {
    return {
      id: this.id,
      nombre: this.nombre,
      padreId: this.padreId,
      orden: this.orden,
      estado: this.estado,
    };
  }

  private _con(overrides: CategoryPropsOverride): Category {
    return new Category({ ...this._props(), ...overrides }, []);
  }

  static reconstituir(props: CategoryProps): Category {
    return new Category(props, []);
  }
}

// Overrides parciales tipados — un solo campo a la vez. Compatible con
// `exactOptionalPropertyTypes: true`.
type CategoryPropsOverride =
  | { readonly nombre: NombreDeCatalogo }
  | { readonly padreId: CategoryId | null }
  | { readonly orden: number }
  | { readonly estado: EstadoDeCategoria };
