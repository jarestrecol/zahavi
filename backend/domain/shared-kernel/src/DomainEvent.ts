/**
 * Contrato base para todos los Domain Events del proyecto Zahavi.
 *
 * Todo evento de dominio es inmutable y lleva suficiente información para
 * reconstruir el hecho ocurrido sin necesidad de consultar el aggregate.
 */
export interface DomainEvent {
  /** UUID v4 único del evento; permite deduplicar en el bus de mensajes. */
  readonly eventoId: string;
  /** Nombre del evento en PascalCase y en español, p. ej. `UsuarioCreado`. */
  readonly tipo: string;
  /** ID del aggregate raíz que emitió el evento. */
  readonly aggregateId: string;
  /** Marca de tiempo Unix en milisegundos (Date.now()) en que ocurrió el hecho. */
  readonly ocurridoEn: number;
  /** Versión del esquema del evento; facilita la evolución del modelo. */
  readonly version: number;
}
