import { Duracion } from './Duracion.js';
import { type Rol } from './enums.js';

export interface PoliticaDeSesionProps {
  readonly umbralBloqueo: Duracion; // solo efectivo si contextoDispositivo = compartido
  readonly umbralCierre: Duracion; // cierre real por inactividad sostenida
  readonly topeAbsoluto: Duracion; // máximo desde iniciadaEn
  readonly limiteSimultaneo: number;
  readonly requiereDispositivoAutorizado: boolean;
}

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

  static de(props: PoliticaDeSesionProps): PoliticaDeSesion {
    if (props.limiteSimultaneo < 1)
      throw new Error('PoliticaDeSesion: limiteSimultaneo debe ser ≥ 1');
    return new PoliticaDeSesion(props);
  }

  // Políticas canónicas confirmadas por Julian
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
