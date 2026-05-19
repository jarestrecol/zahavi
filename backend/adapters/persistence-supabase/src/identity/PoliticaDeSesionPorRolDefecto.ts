import { PoliticaDeSesion, type Rol } from '@zahavi/domain-identity';
import type { PoliticaDeSesionPorRol } from '@zahavi/ports';

export class PoliticaDeSesionPorRolDefecto implements PoliticaDeSesionPorRol {
  obtener(rol: Rol): PoliticaDeSesion {
    return PoliticaDeSesion.porRol(rol);
  }
}
