import type {
  Sesion,
  SesionId,
  UsuarioId,
  DispositivoId,
  FechaHora,
} from '@zahavi/domain-identity';

/** Puerto de persistencia para el aggregate `Sesion`. */
export interface RepositorioDeSesiones {
  /** Retorna la sesión con el ID dado, o `null` si no existe. */
  obtenerPorId(id: SesionId): Promise<Sesion | null>;
  /** Persiste la sesión (insert o update). */
  guardar(sesion: Sesion): Promise<void>;
  /** Lista todas las sesiones activas de un usuario (para control de límite de sesiones simultáneas). */
  listarActivasDeUsuario(usuarioId: UsuarioId): Promise<Sesion[]>;
  /** Cuenta las sesiones activas del usuario (más eficiente que listar cuando solo se necesita el número). */
  contarActivasDeUsuario(usuarioId: UsuarioId): Promise<number>;
  /** Lista sesiones activas asociadas a un dispositivo. */
  listarActivasDeDispositivo(dispositivoId: DispositivoId): Promise<Sesion[]>;
  /** Lista sesiones cuyo `expira_en_absoluto` es anterior a `ahora`, limitando a `limite` registros. */
  listarPotencialmenteExpiradas(ahora: FechaHora, limite: number): Promise<Sesion[]>;
}
