import { type Result, ok, err } from '../errors/DomainError.js';
import { TasaIVAInvalidaError } from '../errors/index.js';
import { Dinero } from './Dinero.js';

const TASAS_VALIDAS = new Set([0, 0.19]);

/**
 * Value Object que representa la tasa de IVA aplicable en Colombia.
 *
 * Tasas válidas: 0% (alimentos básicos) o 19% (tarifa general).
 */
export class TasaIVA {
  static readonly CERO = new TasaIVA(0);
  static readonly IVA_19 = new TasaIVA(0.19);

  private constructor(readonly valor: number) {}

  static of(valor: number): Result<TasaIVA, TasaIVAInvalidaError> {
    if (!TASAS_VALIDAS.has(valor)) return err(new TasaIVAInvalidaError(valor));
    return ok(new TasaIVA(valor));
  }

  /** Calcula el monto de IVA sobre una base sin IVA. */
  calcularIVA(base: Dinero): Dinero {
    return base.porcentaje(this.valor);
  }

  equals(other: TasaIVA): boolean {
    return this.valor === other.valor;
  }

  toString(): string {
    return `${(this.valor * 100).toFixed(0)}%`;
  }
}
