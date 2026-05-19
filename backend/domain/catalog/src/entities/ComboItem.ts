import { ComboItemId, ProductVariantId } from '../value-objects/ids.js';
import { Cantidad } from '../value-objects/Cantidad.js';

/**
 * Línea de un `Combo`. Entidad anidada.
 *
 * - `productVariantId`: referencia a una variante existente. La integridad
 *   referencial (que la variante exista y esté activa) la verifica el caso
 *   de uso vía repositorio; el aggregate `Combo` aislado no la conoce.
 * - `cantidad`: cuántas unidades de esa variante se incluyen en el combo.
 *   Casi siempre será `Cantidad.de(N, 'unidad')`.
 *
 * Identidad estable por `id`. Inmutable.
 */
export interface ComboItemProps {
  readonly id: ComboItemId;
  readonly productVariantId: ProductVariantId;
  readonly cantidad: Cantidad;
}

export class ComboItem {
  readonly id: ComboItemId;
  readonly productVariantId: ProductVariantId;
  readonly cantidad: Cantidad;

  private constructor(props: ComboItemProps) {
    this.id = props.id;
    this.productVariantId = props.productVariantId;
    this.cantidad = props.cantidad;
  }

  static crear(props: ComboItemProps): ComboItem {
    return new ComboItem(props);
  }

  conCantidad(nuevaCantidad: Cantidad): ComboItem {
    return new ComboItem({
      id: this.id,
      productVariantId: this.productVariantId,
      cantidad: nuevaCantidad,
    });
  }

  equals(other: ComboItem): boolean {
    return this.id.equals(other.id);
  }

  static reconstituir(props: ComboItemProps): ComboItem {
    return new ComboItem(props);
  }
}
