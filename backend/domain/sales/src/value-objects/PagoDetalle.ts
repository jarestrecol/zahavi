import { MetodoDePago } from './enums.js';
import { Dinero } from './Dinero.js';

/**
 * Value Object que representa un pago individual dentro de un Cobro.
 *
 * Un Cobro puede tener múltiples PagoDetalle (ej: mitad en efectivo, mitad en NEQUI).
 */
export class PagoDetalle {
  private constructor(
    readonly metodo: MetodoDePago,
    readonly monto: Dinero,
  ) {}

  static crear(metodo: MetodoDePago, monto: Dinero): PagoDetalle {
    return new PagoDetalle(metodo, monto);
  }

  equals(other: PagoDetalle): boolean {
    return this.metodo === other.metodo && this.monto.equals(other.monto);
  }
}
