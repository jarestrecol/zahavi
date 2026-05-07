import type { Rol, PoliticaDeSesion } from '@zahavi/domain-identity';

export interface PoliticaDeSesionPorRol {
  obtener(rol: Rol): PoliticaDeSesion;
}
