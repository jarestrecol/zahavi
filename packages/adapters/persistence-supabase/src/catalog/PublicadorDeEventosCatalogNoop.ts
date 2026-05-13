import type { IPublicadorDeDomainEventsCatalog } from '@zahavi/ports';
import type { CatalogDomainEvent } from '@zahavi/domain-catalog';

export class PublicadorDeEventosCatalogNoop implements IPublicadorDeDomainEventsCatalog {
  async publicar(_evento: CatalogDomainEvent): Promise<void> {
    // No-op: eventos se publican via Supabase Realtime en una implementación futura
  }

  async publicarLote(_eventos: CatalogDomainEvent[]): Promise<void> {
    // No-op
  }
}
