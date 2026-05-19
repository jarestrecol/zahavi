import { FechaHora } from '@zahavi/domain-identity';
import type { Reloj } from '@zahavi/ports';

export class RelojSistema implements Reloj {
  ahora(): FechaHora {
    return FechaHora.deTimestamp(Date.now());
  }
}
