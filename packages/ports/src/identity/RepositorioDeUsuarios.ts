import type { Usuario, UsuarioId, Email, Rol } from '@zahavi/domain-identity';

export interface RepositorioDeUsuarios {
  obtenerPorId(id: UsuarioId): Promise<Usuario | null>;
  obtenerPorEmail(email: Email): Promise<Usuario | null>;
  existeEmail(email: Email): Promise<boolean>;
  guardar(usuario: Usuario): Promise<void>;
  contarSuperadminsActivos(): Promise<number>;
  listarSuperadminsActivos(): Promise<UsuarioId[]>;
  listar(filtro: { rol?: Rol; estado?: 'activo' | 'deshabilitado' }): Promise<Usuario[]>;
}
