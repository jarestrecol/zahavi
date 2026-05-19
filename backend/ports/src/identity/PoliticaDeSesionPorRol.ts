import type { Rol, PoliticaDeSesion } from '@zahavi/domain-identity';

/** Puerto que resuelve la `PoliticaDeSesion` (TTL, límite simultáneo, etc.) en función del rol. */
export interface PoliticaDeSesionPorRol {
  /** Retorna la política aplicable al `rol` indicado. */
  obtener(rol: Rol): PoliticaDeSesion;
}
