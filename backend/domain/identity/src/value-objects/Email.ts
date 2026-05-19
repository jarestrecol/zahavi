import { type Result, ok, err } from '../errors/DomainError.js';
import { EmailInvalidoError } from '../errors/index.js';

// RFC 5321 simplificado: local@dominio, longitud ≤ 254, sin espacios ni comillas
const EMAIL_RE = /^[^\s"@][^@\s]*@[^\s@]+\.[^\s@]+$/;

/**
 * Value Object que representa una dirección de correo electrónico válida y normalizada.
 *
 * Se normaliza a minúsculas en la construcción. Inmutable.
 */
export class Email {
  private constructor(private readonly _value: string) {}

  /**
   * Construye un Email validado y normalizado.
   * @param raw - Dirección de correo cruda proveniente del usuario o la DB.
   * @returns `ok(Email)` si es válida; `err(EmailInvalidoError)` si no cumple RFC 5321.
   */
  static of(raw: string): Result<Email, EmailInvalidoError> {
    const normalized = raw.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized) || normalized.length > 254) {
      return err(new EmailInvalidoError(raw));
    }
    return ok(new Email(normalized));
  }

  /** Devuelve el email normalizado en minúsculas. */
  toString(): string {
    return this._value;
  }

  /** Igualdad por valor (comparación insensible a mayúsculas ya normalizada). */
  equals(other: Email): boolean {
    return this._value === other._value;
  }
}
