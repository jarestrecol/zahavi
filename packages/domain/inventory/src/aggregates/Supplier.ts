import { type Result, ok, err } from '../errors/DomainError.js';
import { FechaHora } from '@zahavi/domain-shared-kernel';
import { ProveedorYaInactivoError } from '../errors/index.js';
import { SupplierId } from '../value-objects/ids.js';
import type {
  InventoryDomainEvent,
  ProveedorCreado,
  ProveedorActualizado,
  ProveedorDesactivado,
} from '../events/index.js';

export interface SupplierProps {
  readonly id: SupplierId;
  readonly nombre: string;
  /** Teléfono o email principal de contacto. */
  readonly contacto: string;
  /** Notas libres. Cadena vacía permitida. */
  readonly notas: string;
  readonly estado: 'activo' | 'inactivo';
  readonly creadoEn: FechaHora;
}

type SupplierPropsOverride = Partial<
  Pick<SupplierProps, 'nombre' | 'contacto' | 'notas' | 'estado'>
>;

/**
 * Aggregate root `Proveedor`.
 *
 * Datos maestros de un proveedor de ingredientes. No mantiene historial de
 * compras (eso vive en el libro de `StockMovement`); solo identidad y estado.
 *
 * Invariantes:
 *   1. `estado` solo transita activo → inactivo (no se reactivan proveedores;
 *      se crea uno nuevo si vuelve a operar).
 *   2. `nombre` y `contacto` no se permiten vacíos al crear (validado por la
 *      capa de aplicación / Zod en el borde; el aggregate los acepta tal cual).
 */
export class Supplier {
  readonly id: SupplierId;
  readonly nombre: string;
  readonly contacto: string;
  readonly notas: string;
  readonly estado: 'activo' | 'inactivo';
  readonly creadoEn: FechaHora;

  private readonly _events: InventoryDomainEvent[];

  private constructor(props: SupplierProps, events: InventoryDomainEvent[] = []) {
    this.id = props.id;
    this.nombre = props.nombre;
    this.contacto = props.contacto;
    this.notas = props.notas;
    this.estado = props.estado;
    this.creadoEn = props.creadoEn;
    this._events = events;
  }

  // ── Factorías ────────────────────────────────────────────────

  static crear(
    props: {
      id: SupplierId;
      nombre: string;
      contacto: string;
      notas?: string;
      ahora: FechaHora;
    },
    eventoId: string,
  ): Result<Supplier, never> {
    const proveedor = new Supplier({
      id: props.id,
      nombre: props.nombre,
      contacto: props.contacto,
      notas: props.notas ?? '',
      estado: 'activo',
      creadoEn: props.ahora,
    });

    const evento: ProveedorCreado = {
      eventoId,
      tipo: 'ProveedorCreado',
      aggregateId: props.id.toString(),
      ocurridoEn: props.ahora.toTimestamp(),
      version: 1,
      payload: {
        supplierId: props.id.toString(),
        nombre: props.nombre,
        contacto: props.contacto,
      },
    };
    proveedor._events.push(evento);
    return ok(proveedor);
  }

  static reconstituir(props: SupplierProps): Supplier {
    return new Supplier(props, []);
  }

  // ── Comandos ─────────────────────────────────────────────────

  desactivar(ahora: FechaHora, eventoId: string): Result<Supplier, ProveedorYaInactivoError> {
    if (this.estado === 'inactivo')
      return err(new ProveedorYaInactivoError(this.id.toString()));

    const nuevo = this._con({ estado: 'inactivo' });
    const evento: ProveedorDesactivado = {
      eventoId,
      tipo: 'ProveedorDesactivado',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: { supplierId: this.id.toString() },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  /**
   * Actualiza datos maestros. Cada campo es opcional; los omitidos se conservan.
   */
  actualizar(
    cambios: { nombre?: string; contacto?: string; notas?: string },
    ahora: FechaHora,
    eventoId: string,
  ): Result<Supplier, never> {
    const nuevo = this._con({
      nombre: cambios.nombre ?? this.nombre,
      contacto: cambios.contacto ?? this.contacto,
      notas: cambios.notas ?? this.notas,
    });

    const evento: ProveedorActualizado = {
      eventoId,
      tipo: 'ProveedorActualizado',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        supplierId: this.id.toString(),
        nombre: nuevo.nombre,
        contacto: nuevo.contacto,
        notas: nuevo.notas,
      },
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

  private _props(): SupplierProps {
    return {
      id: this.id,
      nombre: this.nombre,
      contacto: this.contacto,
      notas: this.notas,
      estado: this.estado,
      creadoEn: this.creadoEn,
    };
  }

  private _con(overrides: SupplierPropsOverride): Supplier {
    return new Supplier({ ...this._props(), ...overrides }, []);
  }
}
