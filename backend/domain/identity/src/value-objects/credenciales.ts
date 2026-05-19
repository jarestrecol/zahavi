import { type Result, ok, err } from '../errors/DomainError.js';
import { PinInvalidoError, ContrasenaDebilError } from '../errors/index.js';

const PIN_RE = /^\d{6}$/;
const HASH_PREFIX_RE = /^\$(argon2id|2b|2a)\$/;
// Mínimo: 1 mayúscula, 1 minúscula, 1 dígito, 1 símbolo, longitud ≥ 12
const COMPLEJIDAD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{12,}$/;

/** PIN efímero de 6 dígitos. toString() redactado para evitar fugas en logs. */
export class Pin {
  private constructor(private readonly _value: string) {}

  static of(raw: string): Result<Pin, PinInvalidoError> {
    if (!PIN_RE.test(raw)) return err(new PinInvalidoError());
    return ok(new Pin(raw));
  }

  /** Solo el hasher puede leer el valor interno. */
  _unsafeRead(): string {
    return this._value;
  }

  toString(): string {
    return '[PIN REDACTADO]';
  }
}

/** Hash persistible de un PIN. Tipo distinto a HashDeContrasena para impedir cruces. */
export class HashDePin {
  private constructor(private readonly _value: string) {}

  static deCadenaYaHasheada(hash: string): HashDePin {
    if (!hash.trim()) throw new Error('HashDePin no puede estar vacío');
    return new HashDePin(hash);
  }

  toString(): string {
    return this._value;
  }

  equals(other: HashDePin): boolean {
    return this._value === other._value;
  }
}

/** Contraseña efímera en claro. toString() redactado. */
export class ContrasenaEnClaro {
  private constructor(private readonly _value: string) {}

  static of(raw: string): Result<ContrasenaEnClaro, ContrasenaDebilError> {
    if (!COMPLEJIDAD_RE.test(raw)) {
      return err(
        new ContrasenaDebilError(
          'longitud mínima 12, debe incluir mayúscula, minúscula, dígito y símbolo',
        ),
      );
    }
    return ok(new ContrasenaEnClaro(raw));
  }

  _unsafeRead(): string {
    return this._value;
  }

  toString(): string {
    return '[CONTRASEÑA REDACTADA]';
  }
}

/** Hash persistible de una contraseña. Prefijo obligatorio del algoritmo. */
export class HashDeContrasena {
  private constructor(private readonly _value: string) {}

  static deCadenaYaHasheada(hash: string): HashDeContrasena {
    if (!HASH_PREFIX_RE.test(hash)) {
      throw new Error(
        `HashDeContrasena: prefijo de algoritmo desconocido en "${hash.slice(0, 12)}..."`,
      );
    }
    return new HashDeContrasena(hash);
  }

  toString(): string {
    return this._value;
  }

  equals(other: HashDeContrasena): boolean {
    return this._value === other._value;
  }
}

/** Código TOTP de 6 dígitos. */
export class CodigoTotp {
  private constructor(private readonly _value: string) {}

  static of(raw: string): Result<CodigoTotp, PinInvalidoError> {
    if (!PIN_RE.test(raw)) return err(new PinInvalidoError());
    return ok(new CodigoTotp(raw));
  }

  toString(): string {
    return '[CODIGO_TOTP REDACTADO]';
  }

  _unsafeRead(): string {
    return this._value;
  }
}

/** Secreto TOTP base32. Almacenado cifrado; el dominio lo trata como caja negra. */
export class SecretoTotp {
  private constructor(private readonly _value: string) {}

  static de(raw: string): SecretoTotp {
    if (!raw.trim()) throw new Error('SecretoTotp no puede estar vacío');
    return new SecretoTotp(raw);
  }

  toString(): string {
    return '[SECRETO_TOTP REDACTADO]';
  }

  _unsafeRead(): string {
    return this._value;
  }
}
