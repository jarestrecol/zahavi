import { RecipeLineId, IngredientId } from '../value-objects/ids.js';
import { Cantidad } from '../value-objects/Cantidad.js';

/**
 * Línea de una `Receta`. Entidad anidada.
 *
 * - `ingredientId`: referencia ACL al BC Inventory. Catalog no conoce el
 *   nombre ni la unidad nativa del ingrediente.
 * - `cantidad`: cuánto se consume para producir 1 unidad del producto.
 *   La `Unidad` está embebida en `Cantidad`.
 * - `esEmpaque`: marca informativa que distingue materia prima de empaques
 *   (bolsa, caja, papel) para reportes. No cambia las invariantes ni el
 *   cálculo de costo.
 *
 * Identidad estable por `id`. Inmutable.
 */
export interface RecipeLineProps {
  readonly id: RecipeLineId;
  readonly ingredientId: IngredientId;
  readonly cantidad: Cantidad;
  readonly esEmpaque: boolean;
}

export class RecipeLine {
  readonly id: RecipeLineId;
  readonly ingredientId: IngredientId;
  readonly cantidad: Cantidad;
  readonly esEmpaque: boolean;

  private constructor(props: RecipeLineProps) {
    this.id = props.id;
    this.ingredientId = props.ingredientId;
    this.cantidad = props.cantidad;
    this.esEmpaque = props.esEmpaque;
  }

  static crear(props: RecipeLineProps): RecipeLine {
    // No hay invariantes adicionales: Cantidad ya valida valor > 0 y unidad
    // pertenece al enum.
    return new RecipeLine(props);
  }

  conCantidad(nuevaCantidad: Cantidad): RecipeLine {
    return new RecipeLine({
      id: this.id,
      ingredientId: this.ingredientId,
      cantidad: nuevaCantidad,
      esEmpaque: this.esEmpaque,
    });
  }

  equals(other: RecipeLine): boolean {
    return this.id.equals(other.id);
  }

  static reconstituir(props: RecipeLineProps): RecipeLine {
    return new RecipeLine(props);
  }
}
