import { LineaDeBOMId, IngredientIdRef } from '../value-objects/ids.js';
import { Cantidad } from '../value-objects/Cantidad.js';

/**
 * Línea del Bill of Materials de una `OrdenDeProduccion`. Entidad anidada
 * (identidad por `id`, ciclo de vida ligado al aggregate raíz).
 *
 * - `ingredientId`: referencia ACL al BC Inventory. Production NO conoce el
 *   nombre, costo ni unidad nativa del ingrediente más allá de la unidad
 *   declarada explícitamente en `cantidadRequerida` (que la capa de
 *   aplicación ya alineó con la unidad nativa de Inventory).
 * - `cantidadRequerida`: cuánto se necesita en total para producir la cantidad
 *   planeada de la OdP (no por unidad — el cálculo `cantidad_receta × N`
 *   ocurre en el caso de uso de aplicación al construir el BOM).
 *
 * Inmutable: cualquier modificación produce una nueva instancia.
 */
export interface LineaDeBOMProps {
  readonly id: LineaDeBOMId;
  readonly ingredientId: IngredientIdRef;
  readonly cantidadRequerida: Cantidad;
}

export class LineaDeBOM {
  readonly id: LineaDeBOMId;
  readonly ingredientId: IngredientIdRef;
  readonly cantidadRequerida: Cantidad;

  private constructor(props: LineaDeBOMProps) {
    this.id = props.id;
    this.ingredientId = props.ingredientId;
    this.cantidadRequerida = props.cantidadRequerida;
  }

  static crear(props: LineaDeBOMProps): LineaDeBOM {
    // Invariante: cantidadRequerida ya está validada por el VO Cantidad (> 0).
    return new LineaDeBOM(props);
  }

  equals(other: LineaDeBOM): boolean {
    return this.id.equals(other.id);
  }

  static reconstituir(props: LineaDeBOMProps): LineaDeBOM {
    return new LineaDeBOM(props);
  }
}
