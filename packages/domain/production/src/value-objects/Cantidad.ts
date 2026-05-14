import { type Result, ok, err } from '../errors/DomainError.js';
import { DomainError } from '../errors/index.js';
import type { UnidadDeMedida } from './enums.js';

// Error local: la magnitud Cantidad en Production tiene su propio error tipado
// para no acoplarse a errores de Inventory/Catalog.
export class CantidadInvalidaError extends DomainError {
  readonly code = 'PRODUCTION_CANTIDAD_INVALIDA';
  constructor(razon: string) {
    super(`Cantidad inválida: ${razon}.`);
  }
}

/**
 * Magnitud positiva con unidad. Inmutable. Value Object.
 *
 * Igual semántica que `Cantidad` en Catalog/Inventory pero con tipo propio:
 * el lenguaje ubicuo de cada BC no debe acoplarse al de otro. La conversión
 * entre unidades es responsabilidad del adapter ACL.
 *
 * Invariantes:
 *   1. `valor > 0` y finito.
 *   2. `unidad` pertenece al enum `UnidadDeMedida`.
 *   3. Las operaciones aritméticas exigen misma `UnidadDeMedida`.
 */
export class Cantidad {
  private constructor(
    private readonly _valor: number,
    private readonly _unidad: UnidadDeMedida,
  ) {}

  static de(valor: number, unidad: UnidadDeMedida): Result<Cantidad, CantidadInvalidaError> {
    if (!Number.isFinite(valor)) return err(new CantidadInvalidaError(`valor no finito: ${valor}`));
    if (valor <= 0) return err(new CantidadInvalidaError(`debe ser > 0, recibido: ${valor}`));
    return ok(new Cantidad(valor, unidad));
  }

  valor(): number {
    return this._valor;
  }

  unidad(): UnidadDeMedida {
    return this._unidad;
  }

  mas(other: Cantidad): Result<Cantidad, CantidadInvalidaError> {
    if (this._unidad !== other._unidad)
      return err(
        new CantidadInvalidaError(
          `unidades incompatibles: "${this._unidad}" vs "${other._unidad}"`,
        ),
      );
    return ok(new Cantidad(this._valor + other._valor, this._unidad));
  }

  menos(other: Cantidad): Result<Cantidad, CantidadInvalidaError> {
    if (this._unidad !== other._unidad)
      return err(
        new CantidadInvalidaError(
          `unidades incompatibles: "${this._unidad}" vs "${other._unidad}"`,
        ),
      );
    const resultado = this._valor - other._valor;
    if (resultado <= 0)
      return err(new CantidadInvalidaError(`resultado no positivo: ${resultado}`));
    return ok(new Cantidad(resultado, this._unidad));
  }

  multiplicarPor(factor: number): Result<Cantidad, CantidadInvalidaError> {
    if (!Number.isFinite(factor) || factor <= 0)
      return err(new CantidadInvalidaError(`factor inválido: ${factor}`));
    return ok(new Cantidad(this._valor * factor, this._unidad));
  }

  esMayorQue(other: Cantidad): Result<boolean, CantidadInvalidaError> {
    if (this._unidad !== other._unidad)
      return err(
        new CantidadInvalidaError(
          `unidades incompatibles: "${this._unidad}" vs "${other._unidad}"`,
        ),
      );
    return ok(this._valor > other._valor);
  }

  equals(other: Cantidad): boolean {
    return this._valor === other._valor && this._unidad === other._unidad;
  }

  toString(): string {
    return `${this._valor} ${this._unidad}`;
  }
}
