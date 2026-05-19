import { type Result, ok, err } from '../errors/DomainError.js';
import { CantidadInvalidaError } from '../errors/index.js';
import type { Unidad } from './enums.js';

/**
 * Magnitud positiva con unidad. Inmutable.
 *
 * Las operaciones aritméticas exigen misma `Unidad`. La conversión de
 * unidades (gramo↔kilogramo, mililitro↔litro) es responsabilidad del
 * adapter ACL hacia Inventory, no de Catalog.
 */
export class Cantidad {
  private constructor(
    private readonly _valor: number,
    private readonly _unidad: Unidad,
  ) {}

  static de(valor: number, unidad: Unidad): Result<Cantidad, CantidadInvalidaError> {
    if (!Number.isFinite(valor)) return err(new CantidadInvalidaError(`valor no finito: ${valor}`));
    if (valor <= 0) return err(new CantidadInvalidaError(`debe ser > 0, recibido: ${valor}`));
    return ok(new Cantidad(valor, unidad));
  }

  valor(): number {
    return this._valor;
  }

  unidad(): Unidad {
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

  multiplicarPor(factor: number): Result<Cantidad, CantidadInvalidaError> {
    if (!Number.isFinite(factor) || factor <= 0)
      return err(new CantidadInvalidaError(`factor inválido: ${factor}`));
    return ok(new Cantidad(this._valor * factor, this._unidad));
  }

  equals(other: Cantidad): boolean {
    return this._valor === other._valor && this._unidad === other._unidad;
  }

  toString(): string {
    return `${this._valor} ${this._unidad}`;
  }
}
