import { Duracion } from './Duracion.js';
import { type Rol } from './enums.js';

/** Props de construcción de una PoliticaDeSesion. */
export interface PoliticaDeSesionProps {
  /** Tiempo de inactividad tras el cual se bloquea la pantalla (no cierra sesión). Solo en dispositivos compartidos. */
  readonly umbralBloqueo: Duracion;
  /** Tiempo de inactividad sostenida tras el cual se cierra la sesión definitivamente. */
  readonly umbralCierre: Duracion;
  /** Duración máxima absoluta desde la creación de la sesión, independientemente de actividad. */
  readonly topeAbsoluto: Duracion;
  /** Número máximo de sesiones simultáneas permitidas para el rol. */
  readonly limiteSimultaneo: number;
  /** `true` si el rol requiere que la sesión se origine en un dispositivo autorizado (WORKER). */
  readonly requiereDispositivoAutorizado: boolean;
}

/**
 * Value Object que encapsula las reglas de duración y restricciones de una sesión por rol.
 *
 * Las políticas canónicas se obtienen con `PoliticaDeSesion.porRol(rol)`.
 * Invariante: `limiteSimultaneo` debe ser ≥ 1.
 */
export class PoliticaDeSesion {
  readonly umbralBloqueo: Duracion;
  readonly umbralCierre: Duracion;
  readonly topeAbsoluto: Duracion;
  readonly limiteSimultaneo: number;
  readonly requiereDispositivoAutorizado: boolean;

  private constructor(props: PoliticaDeSesionProps) {
    this.umbralBloqueo = props.umbralBloqueo;
    this.umbralCierre = props.umbralCierre;
    this.topeAbsoluto = props.topeAbsoluto;
    this.limiteSimultaneo = props.limiteSimultaneo;
    this.requiereDispositivoAutorizado = props.requiereDispositivoAutorizado;
  }

  /**
   * Construye una política personalizada.
   * @throws {Error} Si `limiteSimultaneo` es menor que 1.
   */
  static de(props: PoliticaDeSesionProps): PoliticaDeSesion {
    if (props.limiteSimultaneo < 1)
      throw new Error('PoliticaDeSesion: limiteSimultaneo debe ser ≥ 1');
    return new PoliticaDeSesion(props);
  }

  /** Devuelve la política canónica para el rol dado, confirmada con el negocio. */
  static porRol(rol: Rol): PoliticaDeSesion {
    const umbralBloqueo = Duracion.deMinutos(5);
    switch (rol) {
      case 'SUPERADMIN':
        return PoliticaDeSesion.de({
          umbralBloqueo,
          umbralCierre: Duracion.deMinutos(30),
          topeAbsoluto: Duracion.deHoras(4),
          limiteSimultaneo: 5,
          requiereDispositivoAutorizado: false,
        });
      case 'ADMIN':
        return PoliticaDeSesion.de({
          umbralBloqueo,
          umbralCierre: Duracion.deHoras(1),
          topeAbsoluto: Duracion.deHoras(8),
          limiteSimultaneo: 5,
          requiereDispositivoAutorizado: false,
        });
      case 'WORKER':
        return PoliticaDeSesion.de({
          umbralBloqueo,
          umbralCierre: Duracion.deMinutos(30),
          topeAbsoluto: Duracion.deHoras(12),
          limiteSimultaneo: 1,
          requiereDispositivoAutorizado: true,
        });
    }
  }
}
