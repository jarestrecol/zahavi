import { type Result, ok, err } from '../errors/DomainError.js';
import { MontoInvalidoError, MontoNegativoError } from '../errors/index.js';

/**
 * Value Object que representa un monto monetario en COP (pesos colombianos).
 *
 * Invariantes:
 * - El valor es un entero no negativo (sin decimales, ya que COP no usa centavos).
 * - Es inmutable: toda operación retorna una nueva instancia.
 */
export class Dinero {
  private constructor(private readonly _valor: number) {}

  /** Crea un Dinero desde un entero >= 0. */
  static de(valor: number): Result<Dinero, MontoInvalidoError> {
    if (!Number.isInteger(valor) || valor < 0) return err(new MontoInvalidoError(valor));
    return ok(new Dinero(valor));
  }

  /** Cero pesos. */
  static cero(): Dinero {
    return new Dinero(0);
  }

  /** Crea internamente sin validación — solo para operaciones internas garantizadas. */
  private static fromInt(n: number): Dinero {
    return new Dinero(n);
  }

  get valor(): number {
    return this._valor;
  }

  sumar(other: Dinero): Dinero {
    return Dinero.fromInt(this._valor + other._valor);
  }

  /** Retorna error si la resta produce un valor negativo. */
  restar(other: Dinero): Result<Dinero, MontoNegativoError> {
    if (other._valor > this._valor) return err(new MontoNegativoError());
    return ok(Dinero.fromInt(this._valor - other._valor));
  }

  /** Multiplica por un factor entero positivo (p.ej. cantidad de unidades). */
  multiplicar(factor: number): Dinero {
    return Dinero.fromInt(Math.round(this._valor * factor));
  }

  /** Calcula el porcentaje y redondea al entero más cercano. */
  porcentaje(tasa: number): Dinero {
    return Dinero.fromInt(Math.round(this._valor * tasa));
  }

  equals(other: Dinero): boolean {
    return this._valor === other._valor;
  }

  toString(): string {
    return `$${this._valor.toLocaleString('es-CO')}`;
  }
}
