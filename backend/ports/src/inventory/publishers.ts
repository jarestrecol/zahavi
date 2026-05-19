import type { InventoryDomainEvent } from '@zahavi/domain-inventory';

export interface IPublicadorDeDomainEventsInventory {
  publicar(evento: InventoryDomainEvent): Promise<void>;
  publicarLote(eventos: InventoryDomainEvent[]): Promise<void>;
}
