import type {
  Sesion,
  SesionId,
  UsuarioId,
  DispositivoId,
  FechaHora,
} from '@zahavi/domain-identity';

export interface RepositorioDeSesiones {
  obtenerPorId(id: SesionId): Promise<Sesion | null>;
  guardar(sesion: Sesion): Promise<void>;
  listarActivasDeUsuario(usuarioId: UsuarioId): Promise<Sesion[]>;
  contarActivasDeUsuario(usuarioId: UsuarioId): Promise<number>;
  listarActivasDeDispositivo(dispositivoId: DispositivoId): Promise<Sesion[]>;
  listarPotencialmenteExpiradas(ahora: FechaHora, limite: number): Promise<Sesion[]>;
}
