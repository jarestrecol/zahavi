import { type Result, ok, err } from '../errors/DomainError.js';
import { NombreDeCatalogoInvalidoError } from '../errors/index.js';

/**
 * Nombre normalizado para `Producto`, `Combo` o `Categoria`.
 * - Longitud: 2..120 caracteres tras normalizar.
 * - Espacios colapsados a uno.
 * - Sin caracteres de control.
 * - Conserva mayúsculas/minúsculas (a diferencia de `Email`); el negocio usa
 *   nombres como "Café Mediano", "Pan de Yuca".
 */
export class NombreDeCatalogo {
  private constructor(private readonly _value: string) {}

  static of(raw: string): Result<NombreDeCatalogo, NombreDeCatalogoInvalidoError> {
    // Rechazar caracteres de control antes de normalizar: \s+ reemplazaría \n por espacio
    // antes de que el chequeo los detecte.
    if (/[\x00-\x1F\x7F]/.test(raw)) return err(new NombreDeCatalogoInvalidoError(raw));
    const trimmed = raw.trim().replace(/\s+/g, ' ');
    if (trimmed.length < 2 || trimmed.length > 120)
      return err(new NombreDeCatalogoInvalidoError(raw));
    return ok(new NombreDeCatalogo(trimmed));
  }

  toString(): string {
    return this._value;
  }

  equals(other: NombreDeCatalogo): boolean {
    return this._value === other._value;
  }
}
