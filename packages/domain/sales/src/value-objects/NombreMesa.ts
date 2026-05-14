import { type Result, ok, err } from '../errors/DomainError.js';
import { NombreMesaInvalidoError } from '../errors/index.js';

/**
 * Value Object para el nombre visible de una mesa (ej: "Mesa 1", "Terraza 3", "Mostrador").
 */
export class NombreMesa {
  private constructor(private readonly _value: string) {}

  static of(value: string): Result<NombreMesa, NombreMesaInvalidoError> {
    const trimmed = value.trim();
    if (trimmed.length === 0) return err(new NombreMesaInvalidoError());
    return ok(new NombreMesa(trimmed));
  }

  toString(): string {
    return this._value;
  }

  equals(other: NombreMesa): boolean {
    return this._value === other._value;
  }
}
