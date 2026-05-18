import { Dinero } from './Dinero.js';
import { TasaIVA } from './TasaIVA.js';
import { ProductVariantIdRef } from './ids.js';

/**
 * Value Object inmutable que representa una línea dentro de la Factura.
 * Es un snapshot de la LineaDeComanda en el momento del cierre.
 */
export class FacturaLinea {
  readonly subtotalSinIVA: Dinero;
  readonly subtotalIVA: Dinero;
  readonly subtotalConIVA: Dinero;

  private constructor(
    readonly varianteId: ProductVariantIdRef,
    readonly nombreProducto: string,
    readonly cantidad: number,
    readonly precioUnitario: Dinero,
    readonly tasaIVA: TasaIVA,
  ) {
    this.subtotalSinIVA = precioUnitario.multiplicar(cantidad);
    this.subtotalIVA = tasaIVA.calcularIVA(this.subtotalSinIVA);
    this.subtotalConIVA = this.subtotalSinIVA.sumar(this.subtotalIVA);
  }

  static crear(datos: {
    varianteId: ProductVariantIdRef;
    nombreProducto: string;
    cantidad: number;
    precioUnitario: Dinero;
    tasaIVA: TasaIVA;
  }): FacturaLinea {
    return new FacturaLinea(
      datos.varianteId,
      datos.nombreProducto,
      datos.cantidad,
      datos.precioUnitario,
      datos.tasaIVA,
    );
  }
}
