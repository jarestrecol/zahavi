import { type Result, ok, err } from '../errors/DomainError.js';
import { NumeroFacturaInvalidoError } from '../errors/index.js';

/**
 * Value Object para el número de factura interno (ej: "FAC-2026-00001").
 * La secuencia es gestionada externamente por el adapter de persistencia.
 */
export class NumeroFactura {
  private constructor(private readonly _value: string) {}

  static of(value: string): Result<NumeroFactura, NumeroFacturaInvalidoError> {
    const trimmed = value.trim();
    if (trimmed.length === 0) return err(new NumeroFacturaInvalidoError());
    return ok(new NumeroFactura(trimmed));
  }

  toString(): string {
    return this._value;
  }

  equals(other: NumeroFactura): boolean {
    return this._value === other._value;
  }
}
