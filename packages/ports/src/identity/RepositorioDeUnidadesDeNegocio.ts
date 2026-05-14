import type { UsuarioId } from '@zahavi/domain-identity';

/** Puerto de acceso a la relacion usuario-unidad de negocio. */
export interface RepositorioDeUnidadesDeNegocio {
  /** Devuelve los UUIDs de las unidades a las que el usuario tiene acceso. */
  listarIdsPorUsuario(usuarioId: UsuarioId): Promise<string[]>;
  /** Devuelve true si el usuario pertenece a la unidad de negocio indicada. */
  perteneceAlUsuario(usuarioId: UsuarioId, businessUnitId: string): Promise<boolean>;
}
