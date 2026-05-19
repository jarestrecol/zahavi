import type { Kysely } from 'kysely';
import type { UsuarioId } from '@zahavi/domain-identity';
import { RepositorioNoDisponibleError } from '@zahavi/ports';
import type { RepositorioDeUnidadesDeNegocio } from '@zahavi/ports';
import type { IdentityDatabase } from './schema.js';

export class RepositorioDeUnidadesSupabase implements RepositorioDeUnidadesDeNegocio {
  constructor(private readonly db: Kysely<IdentityDatabase>) {}

  async listarIdsPorUsuario(usuarioId: UsuarioId): Promise<string[]> {
    try {
      const rows = await this.db
        .selectFrom('identity.user_business_units')
        .select('business_unit_id')
        .where('user_id', '=', usuarioId.toString())
        .execute();
      return rows.map((r) => r.business_unit_id);
    } catch (cause) {
      throw new RepositorioNoDisponibleError(cause);
    }
  }

  async perteneceAlUsuario(usuarioId: UsuarioId, businessUnitId: string): Promise<boolean> {
    try {
      const row = await this.db
        .selectFrom('identity.user_business_units')
        .select('user_id')
        .where('user_id', '=', usuarioId.toString())
        .where('business_unit_id', '=', businessUnitId)
        .executeTakeFirst();
      return row !== undefined;
    } catch (cause) {
      throw new RepositorioNoDisponibleError(cause);
    }
  }
}
