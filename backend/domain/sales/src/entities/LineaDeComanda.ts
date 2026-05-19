import { Dinero } from '../value-objects/Dinero.js';
import { TasaIVA } from '../value-objects/TasaIVA.js';
import { EstadoDeLinea } from '../value-objects/enums.js';
import { LineaDeComandaId, ProductVariantIdRef } from '../value-objects/ids.js';

export interface LineaDeComandaProps {
  readonly id: LineaDeComandaId;
  readonly varianteId: ProductVariantIdRef;
  readonly nombreProducto: string;
  readonly cantidad: number;
  readonly precioUnitario: Dinero;
  readonly tasaIVA: TasaIVA;
  readonly estado: EstadoDeLinea;
}

/**
 * Entidad `LineaDeComanda` — parte del aggregate `Comanda`.
 *
 * Snapshot del producto en el momento de la venta: guarda nombre y precio
 * para que sean inmutables aunque el catálogo cambie después.
 */
export class LineaDeComanda {
  readonly id: LineaDeComandaId;
  readonly varianteId: ProductVariantIdRef;
  readonly nombreProducto: string;
  readonly cantidad: number;
  readonly precioUnitario: Dinero;
  readonly tasaIVA: TasaIVA;
  readonly estado: EstadoDeLinea;

  private constructor(props: LineaDeComandaProps) {
    this.id = props.id;
    this.varianteId = props.varianteId;
    this.nombreProducto = props.nombreProducto;
    this.cantidad = props.cantidad;
    this.precioUnitario = props.precioUnitario;
    this.tasaIVA = props.tasaIVA;
    this.estado = props.estado;
  }

  static crear(props: Omit<LineaDeComandaProps, 'estado'>): LineaDeComanda {
    return new LineaDeComanda({ ...props, estado: EstadoDeLinea.PENDIENTE });
  }

  /** Reconstitución desde persistencia. */
  static reconstituir(props: LineaDeComandaProps): LineaDeComanda {
    return new LineaDeComanda(props);
  }

  get subtotalSinIVA(): Dinero {
    return this.precioUnitario.multiplicar(this.cantidad);
  }

  get subtotalIVA(): Dinero {
    return this.tasaIVA.calcularIVA(this.subtotalSinIVA);
  }

  get subtotalConIVA(): Dinero {
    return this.subtotalSinIVA.sumar(this.subtotalIVA);
  }

  get estaActiva(): boolean {
    return this.estado !== EstadoDeLinea.CANCELADA;
  }

  cancelar(): LineaDeComanda {
    return new LineaDeComanda({ ...this, estado: EstadoDeLinea.CANCELADA });
  }

  marcarServida(): LineaDeComanda {
    return new LineaDeComanda({ ...this, estado: EstadoDeLinea.SERVIDA });
  }
}
