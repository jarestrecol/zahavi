import { type Result, ok, err } from './DomainError.js';
import { MoneyInvalidoError } from './errors.js';

/**
 * Value Object inmutable que representa un importe monetario en pesos colombianos (COP).
 * Almacena siempre como entero positivo. No admite decimales ni valores negativos.
 */
export class Money {
  private constructor(private readonly _cop: number) {}

  /**
   * Constructor principal. Falla si `valor` no es entero positivo finito.
   * @param valor - Entero en COP (ej. `12500` = $12.500).
   */
  static deCop(valor: number): Result<Money, MoneyInvalidoError> {
    if (!Number.isFinite(valor)) return err(new MoneyInvalidoError('valor no finito'));
    if (!Number.isInteger(valor))
      return err(new MoneyInvalidoError(`COP no admite decimales: ${valor}`));
    if (valor < 0) return err(new MoneyInvalidoError(`monto negativo: ${valor}`));
    return ok(new Money(valor));
  }

  static cero(): Money {
    return new Money(0);
  }

  toCop(): number {
    return this._cop;
  }

  esCero(): boolean {
    return this._cop === 0;
  }

  esPositivo(): boolean {
    return this._cop > 0;
  }

  mas(other: Money): Money {
    return new Money(this._cop + other._cop);
  }

  menos(other: Money): Result<Money, MoneyInvalidoError> {
    const resultado = this._cop - other._cop;
    if (resultado < 0) return err(new MoneyInvalidoError(`resta negativa: ${resultado}`));
    return ok(new Money(resultado));
  }

  multiplicarPor(factor: number): Result<Money, MoneyInvalidoError> {
    if (!Number.isFinite(factor)) return err(new MoneyInvalidoError('factor no finito'));
    if (factor < 0) return err(new MoneyInvalidoError(`factor negativo: ${factor}`));
    return ok(new Money(Math.round(this._cop * factor)));
  }

  esMayorQue(other: Money): boolean {
    return this._cop > other._cop;
  }

  esMenorQue(other: Money): boolean {
    return this._cop < other._cop;
  }

  equals(other: Money): boolean {
    return this._cop === other._cop;
  }

  toString(): string {
    return `${this._cop} COP`;
  }
}
