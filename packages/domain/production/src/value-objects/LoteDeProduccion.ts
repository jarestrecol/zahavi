import { FechaHora } from '@zahavi/domain-shared-kernel';
import { CodigoDeLote } from './CodigoDeLote.js';

/**
 * Lote de Producción. Value Object inmutable.
 *
 * Representa el producto terminado y trazable resultado de ejecutar una
 * `OrdenDeProduccion`. Una OdP produce exactamente UN lote.
 *
 * Invariantes:
 *   1. `cantidadProducida` es entero >= 1 (validado en la factoría del aggregate
 *      al ejecutar, no aquí, porque depende de la cantidad planeada).
 *   2. `producidoEn` es la fecha-hora en que se ejecutó la OdP.
 *   3. `codigo` es único en el negocio (responsabilidad de la capa de aplicación).
 *
 * NOTA: este VO es trazabilidad pura; la disponibilidad del lote en el punto
 * de venta es manejada por el aggregate `Despacho` y por Sales.
 */
export class LoteDeProduccion {
  readonly codigo: CodigoDeLote;
  readonly cantidadProducida: number;
  readonly producidoEn: FechaHora;

  private constructor(codigo: CodigoDeLote, cantidadProducida: number, producidoEn: FechaHora) {
    this.codigo = codigo;
    this.cantidadProducida = cantidadProducida;
    this.producidoEn = producidoEn;
  }

  /**
   * Crea un Lote ya validado. La factoría no verifica `cantidadProducida` contra
   * la cantidad planeada de la OdP: esa invariante vive en el aggregate
   * `OrdenDeProduccion.ejecutar()`, donde se cuenta con ambos valores.
   *
   * Solo asegura `cantidadProducida` entero positivo.
   */
  static crear(
    codigo: CodigoDeLote,
    cantidadProducida: number,
    producidoEn: FechaHora,
  ): LoteDeProduccion {
    // Invariante: cantidadProducida entero positivo. La factoría es estricta
    // a propósito; los callers deben validar antes (cf. OrdenDeProduccion.ejecutar).
    if (!Number.isInteger(cantidadProducida) || cantidadProducida <= 0) {
      throw new Error(
        `LoteDeProduccion.crear: cantidadProducida debe ser entero > 0, recibido ${cantidadProducida}`,
      );
    }
    return new LoteDeProduccion(codigo, cantidadProducida, producidoEn);
  }

  equals(other: LoteDeProduccion): boolean {
    return (
      this.codigo.equals(other.codigo) &&
      this.cantidadProducida === other.cantidadProducida &&
      this.producidoEn.equals(other.producidoEn)
    );
  }
}
