import type { InventoryDomainEvent } from '@zahavi/domain-inventory';

/**
 * Puerto de salida para publicar Domain Events del bounded context Inventory.
 *
 * La implementación puede enrutar eventos a Supabase Realtime para notificar
 * alertas de stock bajo en tiempo real a los dispositivos conectados.
 */
export interface IPublicadorDeDomainEventsInventory {
  /**
   * Publica un único evento de dominio de Inventory.
   * @param evento - Evento a publicar; debe incluir `eventoId` único para deduplicación.
   */
  publicar(evento: InventoryDomainEvent): Promise<void>;

  /**
   * Publica un lote de eventos de dominio de Inventory en una sola operación.
   * Preferido cuando un caso de uso genera múltiples eventos.
   * @param eventos - Lista de eventos a publicar en orden.
   */
  publicarLote(eventos: InventoryDomainEvent[]): Promise<void>;
}
