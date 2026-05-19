import { type Result, ok, err } from '../errors/DomainError.js';
import { NombreCompletoInvalidoError } from '../errors/index.js';

/**
 * Value Object que representa el nombre completo de un usuario del sistema.
 *
 * Normaliza espacios múltiples y rechaza cadenas menores de 2 o mayores de 120 caracteres.
 * Inmutable.
 */
export class NombreCompleto {
  private constructor(private readonly _value: string) {}

  /**
   * Construye un NombreCompleto validado y normalizado.
   * @param raw - Nombre crudo del usuario.
   * @returns `ok(NombreCompleto)` si es válido; `err(NombreCompletoInvalidoError)` si no.
   */
  static of(raw: string): Result<NombreCompleto, NombreCompletoInvalidoError> {
    const trimmed = raw.trim().replace(/\s+/g, ' ');
    if (trimmed.length < 2 || trimmed.length > 120) {
      return err(new NombreCompletoInvalidoError(raw));
    }
    // Rechaza cadenas solo con espacios o caracteres de control
    if (/[\x00-\x1F\x7F]/.test(trimmed)) {
      return err(new NombreCompletoInvalidoError(raw));
    }
    return ok(new NombreCompleto(trimmed));
  }

  toString(): string {
    return this._value;
  }

  equals(other: NombreCompleto): boolean {
    return this._value === other._value;
  }
}
