/**
 * Clase base de todos los errores de dominio.
 * Cada subclase debe declarar un `code` único en formato `BC_NOMBRE_ERROR`.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Unión discriminada para operaciones que pueden fallar con error de dominio.
 * Reemplaza excepciones en la capa de casos de uso: permite manejo tipado sin try/catch.
 *
 * @example
 * const result: Result<Usuario> = await caso.execute(cmd);
 * if (!result.ok) throw result.error; // error tipado como DomainError
 * return result.value;
 */
export type Result<T, E extends DomainError = DomainError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/** Construye un `Result` exitoso. */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/** Construye un `Result` fallido con el error de dominio dado. */
export function err<E extends DomainError>(error: E): Result<never, E> {
  return { ok: false, error };
}
