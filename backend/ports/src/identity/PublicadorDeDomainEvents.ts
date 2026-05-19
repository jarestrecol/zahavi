import type { IdentityDomainEvent } from '@zahavi/domain-identity';

/**
 * Puerto de salida para publicar Domain Events del bounded context Identity.
 *
 * La implementación concreta puede enrutar a un bus en memoria, Supabase Realtime
 * u otro mecanismo de mensajería sin que el dominio dependa de ninguno de ellos.
 */
export interface PublicadorDeDomainEvents {
  /**
   * Publica uno o varios eventos de dominio de Identity en orden.
   * @param eventos - Lista inmutable de eventos a publicar.
   */
  publicar(eventos: ReadonlyArray<IdentityDomainEvent>): Promise<void>;
}
