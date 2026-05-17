import type { Usuario, UsuarioId, Email, Rol } from '@zahavi/domain-identity';

/** Puerto de persistencia para el aggregate `Usuario`. */
export interface RepositorioDeUsuarios {
  /** Retorna el usuario con el ID dado, o `null` si no existe. */
  obtenerPorId(id: UsuarioId): Promise<Usuario | null>;
  /** Retorna el usuario con el email dado, o `null` si no existe. */
  obtenerPorEmail(email: Email): Promise<Usuario | null>;
  /** `true` si el email ya está registrado en el sistema. */
  existeEmail(email: Email): Promise<boolean>;
  /** Persiste el aggregate (insert o update según si ya existe). */
  guardar(usuario: Usuario): Promise<void>;
  /** Retorna el número de usuarios con rol SUPERADMIN y estado activo. */
  contarSuperadminsActivos(): Promise<number>;
  /** Retorna los IDs de todos los SUPERADMIN activos. */
  listarSuperadminsActivos(): Promise<UsuarioId[]>;
  /** Lista usuarios filtrando opcionalmente por rol y/o estado. */
  listar(filtro: { rol?: Rol; estado?: 'activo' | 'deshabilitado' }): Promise<Usuario[]>;
}
