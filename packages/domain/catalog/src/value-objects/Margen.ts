import { type Result, ok, err } from '../errors/DomainError.js';
import { MoneyInvalidoError } from '../errors/index.js';
import { Money } from './Money.js';

/**
 * Resultado del cálculo de margen para una variante específica.
 *
 * **Importante**: este VO NO se persiste. Se materializa solo cuando se
 * invoca explícitamente `Producto.calcularMargen(receta, costos)`. La
 * autorización (solo ADMIN/SUPERADMIN puede consultarlo) es responsabilidad
 * de la capa de aplicación, no del dominio.
 *
 * - `precioVenta`: precio de la variante.
 * - `costoUnitario`: costo total de los ingredientes (incluyendo empaques).
 * - `montoMargen`: precioVenta - costoUnitario.
 * - `porcentajeMargen`: (montoMargen / precioVenta) * 100, en [0, 100].
 *
 * Si `precioVenta == 0` el porcentaje se reporta como 0 (no se divide entre
 * cero); la factoría `Producto` ya rechaza precios cero, por lo que en la
 * práctica esto no ocurre.
 */
export class Margen {
  private constructor(
    readonly precioVenta: Money,
    readonly costoUnitario: Money,
    readonly montoMargen: Money,
    readonly porcentajeMargen: number,
  ) {}

  static calcular(
    precioVenta: Money,
    costoUnitario: Money,
  ): Result<Margen, MoneyInvalidoError> {
    if (costoUnitario.esMayorQue(precioVenta)) {
      // Costo > precio implica margen negativo. Catalog lo permite (puede ser
      // un producto promocional bajo costo) pero lo expone como margen 0 con
      // monto negativo encapsulado en un `MoneyInvalidoError` informativo.
      return err(
        new MoneyInvalidoError(
          `costo (${costoUnitario.toString()}) supera al precio de venta (${precioVenta.toString()})`,
        ),
      );
    }

    const restaResult = precioVenta.menos(costoUnitario);
    if (!restaResult.ok) return err(restaResult.error);
    const monto = restaResult.value;

    const porcentaje = precioVenta.esCero()
      ? 0
      : (monto.toCop() / precioVenta.toCop()) * 100;

    return ok(new Margen(precioVenta, costoUnitario, monto, porcentaje));
  }

  equals(other: Margen): boolean {
    return (
      this.precioVenta.equals(other.precioVenta) &&
      this.costoUnitario.equals(other.costoUnitario) &&
      this.montoMargen.equals(other.montoMargen) &&
      this.porcentajeMargen === other.porcentajeMargen
    );
  }
}
