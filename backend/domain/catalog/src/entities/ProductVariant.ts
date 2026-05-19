import { type Result, ok, err } from '../errors/DomainError.js';
import { PrecioInvalidoError } from '../errors/index.js';
import { ProductVariantId, RecipeId } from '../value-objects/ids.js';
import { NombreDeCatalogo } from '../value-objects/NombreDeCatalogo.js';
import { Money } from '../value-objects/Money.js';

/**
 * Variante de un `Producto`. Entidad anidada.
 *
 * Identidad estable por `id`. Inmutable: las mutaciones devuelven una nueva
 * instancia. La igualdad se determina por `id`.
 *
 * Invariante propia: `precio > 0` (no se vende gratis). El VO `Money` ya
 * impide negativos; aquí adicionalmente rechazamos el cero.
 *
 * `recetaId = null` indica "variante de reventa": su costo proviene del último
 * precio de compra en Inventory, no de una receta. La bifurcación de lógica de
 * escandallo ocurre en el caso de uso, no en el dominio.
 */
export interface ProductVariantProps {
  readonly id: ProductVariantId;
  readonly nombre: NombreDeCatalogo;
  readonly precio: Money;
  readonly recetaId: RecipeId | null;
}

export class ProductVariant {
  readonly id: ProductVariantId;
  readonly nombre: NombreDeCatalogo;
  readonly precio: Money;
  readonly recetaId: RecipeId | null;

  private constructor(props: ProductVariantProps) {
    this.id = props.id;
    this.nombre = props.nombre;
    this.precio = props.precio;
    this.recetaId = props.recetaId;
  }

  static crear(props: ProductVariantProps): Result<ProductVariant, PrecioInvalidoError> {
    if (!props.precio.esPositivo())
      return err(new PrecioInvalidoError(`la variante "${props.id}" debe tener precio > 0`));
    return ok(new ProductVariant(props));
  }

  conPrecio(nuevoPrecio: Money): Result<ProductVariant, PrecioInvalidoError> {
    if (!nuevoPrecio.esPositivo())
      return err(new PrecioInvalidoError(`la variante "${this.id}" debe tener precio > 0`));
    return ok(
      new ProductVariant({
        id: this.id,
        nombre: this.nombre,
        precio: nuevoPrecio,
        recetaId: this.recetaId,
      }),
    );
  }

  conNombre(nuevoNombre: NombreDeCatalogo): ProductVariant {
    return new ProductVariant({
      id: this.id,
      nombre: nuevoNombre,
      precio: this.precio,
      recetaId: this.recetaId,
    });
  }

  conReceta(recetaId: RecipeId): ProductVariant {
    return new ProductVariant({ id: this.id, nombre: this.nombre, precio: this.precio, recetaId });
  }

  esDeReventa(): boolean {
    return this.recetaId === null;
  }

  equals(other: ProductVariant): boolean {
    return this.id.equals(other.id);
  }

  static reconstituir(props: ProductVariantProps): ProductVariant {
    return new ProductVariant(props);
  }
}
