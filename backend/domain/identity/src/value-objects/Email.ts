import { type Result, ok, err } from '../errors/DomainError.js';
import { EmailInvalidoError } from '../errors/index.js';

// RFC 5321 simplificado: local@dominio, longitud ≤ 254, sin espacios ni comillas
const EMAIL_RE = /^[^\s"@][^@\s]*@[^\s@]+\.[^\s@]+$/;

export class Email {
  private constructor(private readonly _value: string) {}

  static of(raw: string): Result<Email, EmailInvalidoError> {
    const normalized = raw.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized) || normalized.length > 254) {
      return err(new EmailInvalidoError(raw));
    }
    return ok(new Email(normalized));
  }

  toString(): string {
    return this._value;
  }

  equals(other: Email): boolean {
    return this._value === other._value;
  }
}
