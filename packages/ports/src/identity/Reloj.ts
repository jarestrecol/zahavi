import type { FechaHora } from '@zahavi/domain-identity';

export interface Reloj {
  ahora(): FechaHora;
}
