import type { PublicadorDeDomainEvents } from '@zahavi/ports';
import type { IdentityDomainEvent } from '@zahavi/domain-identity';

/**
 * Implementación temporal: registra eventos en consola.
 * TODO: reemplazar por implementación outbox con tabla identity.eventos_outbox
 * para garantizar entrega al menos una vez tras commit.
 */
export class PublicadorDeEventosNoop implements PublicadorDeDomainEvents {
  async publicar(eventos: ReadonlyArray<IdentityDomainEvent>): Promise<void> {
    for (const evento of eventos) {
      console.warn('[domain-event]', evento.tipo, evento.aggregateId, evento.ocurridoEn);
    }
  }
}
