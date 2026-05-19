import type { IPublicadorDeDomainEventsInventory } from '@zahavi/ports';
import type { InventoryDomainEvent } from '@zahavi/domain-inventory';

export class PublicadorDeEventosInventoryNoop implements IPublicadorDeDomainEventsInventory {
  async publicar(_evento: InventoryDomainEvent): Promise<void> {}
  async publicarLote(_eventos: InventoryDomainEvent[]): Promise<void> {}
}
