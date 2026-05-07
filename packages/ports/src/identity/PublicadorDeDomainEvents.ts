import type { IdentityDomainEvent } from '@zahavi/domain-identity';

export interface PublicadorDeDomainEvents {
  publicar(eventos: ReadonlyArray<IdentityDomainEvent>): Promise<void>;
}
