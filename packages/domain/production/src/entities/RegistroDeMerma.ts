import { FechaHora } from '@zahavi/domain-shared-kernel';
import { RegistroDeMermaId, IngredientIdRef, UsuarioIdRef } from '../value-objects/ids.js';
import { Cantidad } from '../value-objects/Cantidad.js';

/**
 * Registro de merma producido durante la ejecución de una
 * `OrdenDeProduccion`. Entidad anidada (identidad estable por `id`,
 * ciclo de vida ligado al aggregate raíz).
 *
 * - `ingredientId`: el ingrediente desperdiciado (suma a la merma que se
 *   descuenta de Inventory como `WASTE`).
 * - `cantidad`: magnitud y unidad. Misma unidad que la línea de BOM
 *   correspondiente (validado en el aggregate raíz).
 * - `motivo`: texto no vacío. Requisito de auditabilidad.
 * - `registradaPor`: usuario que reporta la merma.
 *
 * Inmutable: una merma reportada no se edita; se cancela la OdP si fuera
 * un error grave.
 */
export interface RegistroDeMermaProps {
  readonly id: RegistroDeMermaId;
  readonly ingredientId: IngredientIdRef;
  readonly cantidad: Cantidad;
  readonly motivo: string;
  readonly registradaPor: UsuarioIdRef;
  readonly registradaEn: FechaHora;
}

export class RegistroDeMerma {
  readonly id: RegistroDeMermaId;
  readonly ingredientId: IngredientIdRef;
  readonly cantidad: Cantidad;
  readonly motivo: string;
  readonly registradaPor: UsuarioIdRef;
  readonly registradaEn: FechaHora;

  private constructor(props: RegistroDeMermaProps) {
    this.id = props.id;
    this.ingredientId = props.ingredientId;
    this.cantidad = props.cantidad;
    this.motivo = props.motivo;
    this.registradaPor = props.registradaPor;
    this.registradaEn = props.registradaEn;
  }

  /**
   * Crea el registro. La validación de motivo no vacío se hace aquí
   * (no es opcional). El resto de invariantes (estado de la OdP,
   * cantidad <= consumo) viven en el aggregate raíz.
   */
  static crear(props: RegistroDeMermaProps): RegistroDeMerma {
    // Invariante: motivo no vacío
    if (props.motivo.trim().length === 0) {
      throw new Error('RegistroDeMerma.crear: motivo no puede estar vacío');
    }
    return new RegistroDeMerma({ ...props, motivo: props.motivo.trim() });
  }

  equals(other: RegistroDeMerma): boolean {
    return this.id.equals(other.id);
  }

  static reconstituir(props: RegistroDeMermaProps): RegistroDeMerma {
    return new RegistroDeMerma(props);
  }
}
