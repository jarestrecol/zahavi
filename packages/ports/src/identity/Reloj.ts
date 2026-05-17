import type { FechaHora } from '@zahavi/domain-identity';

/** Puerto de tiempo. Inyectable para permitir pruebas determinísticas con tiempo simulado. */
export interface Reloj {
  /** Retorna el instante actual como `FechaHora` (America/Bogota). */
  ahora(): FechaHora;
}
