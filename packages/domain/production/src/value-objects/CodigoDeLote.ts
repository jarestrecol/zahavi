import { type Result, ok, err } from '../errors/DomainError.js';
import { CodigoDeLoteInvalidoError } from '../errors/index.js';

// Formato de código de lote para Zahavi: "LOTE-AAAAMMDD-NNNN"
// Ej: "LOTE-20260513-0001". Letras y dígitos ASCII en mayúsculas, guiones.
const CODIGO_RE = /^LOTE-\d{8}-\d{4}$/;

/**
 * Código humano-legible del lote de producción. Value Object inmutable.
 *
 * Invariantes:
 *   1. Cumple el formato `LOTE-AAAAMMDD-NNNN`.
 *   2. La generación de códigos únicos no es competencia del dominio: la capa
 *      de aplicación inyecta el código ya construido (vía un servicio de
 *      numeración propio o sequence en DB).
 */
export class CodigoDeLote {
  private constructor(private readonly _value: string) {}

  static of(value: string): Result<CodigoDeLote, CodigoDeLoteInvalidoError> {
    if (typeof value !== 'string') return err(new CodigoDeLoteInvalidoError('debe ser string'));
    const v = value.trim().toUpperCase();
    if (!CODIGO_RE.test(v))
      return err(
        new CodigoDeLoteInvalidoError(`formato esperado "LOTE-AAAAMMDD-NNNN", recibido "${value}"`),
      );
    return ok(new CodigoDeLote(v));
  }

  toString(): string {
    return this._value;
  }

  equals(other: CodigoDeLote): boolean {
    return this._value === other._value;
  }
}
