import type { Kysely } from 'kysely';
import type { RepositorioDeSesiones } from '@zahavi/ports';
import type {
  Sesion,
  SesionId,
  UsuarioId,
  DispositivoId,
  FechaHora,
} from '@zahavi/domain-identity';
import { RepositorioNoDisponibleError as Err } from '@zahavi/ports';
import type { IdentityDatabase } from './schema.js';
import { rowToSesion, sesionToRow } from './mappers.js';

export class RepositorioDeSesionesSupabase implements RepositorioDeSesiones {
  constructor(private readonly db: Kysely<IdentityDatabase>) {}

  async obtenerPorId(id: SesionId): Promise<Sesion | null> {
    try {
      const row = await this.db
        .selectFrom('identity.sesiones')
        .selectAll()
        .where('id', '=', id.toString())
        .executeTakeFirst();
      return row !== undefined ? rowToSesion(row) : null;
    } catch (e) {
      throw new Err(e);
    }
  }

  async guardar(sesion: Sesion): Promise<void> {
    try {
      const row = sesionToRow(sesion);
      await this.db
        .insertInto('identity.sesiones')
        .values(row)
        .onConflict((oc) => oc.column('id').doUpdateSet(row))
        .execute();
    } catch (e) {
      throw new Err(e);
    }
  }

  async listarActivasDeUsuario(usuarioId: UsuarioId): Promise<Sesion[]> {
    try {
      const rows = await this.db
        .selectFrom('identity.sesiones')
        .selectAll()
        .where('usuario_id', '=', usuarioId.toString())
        .where('estado_sesion', '=', 'activa')
        .execute();
      return rows.map(rowToSesion);
    } catch (e) {
      throw new Err(e);
    }
  }

  async contarActivasDeUsuario(usuarioId: UsuarioId): Promise<number> {
    try {
      const result = await this.db
        .selectFrom('identity.sesiones')
        .select((eb) => eb.fn.countAll<number>().as('total'))
        .where('usuario_id', '=', usuarioId.toString())
        .where('estado_sesion', '=', 'activa')
        .executeTakeFirstOrThrow();
      return Number(result.total);
    } catch (e) {
      throw new Err(e);
    }
  }

  async listarActivasDeDispositivo(dispositivoId: DispositivoId): Promise<Sesion[]> {
    try {
      const rows = await this.db
        .selectFrom('identity.sesiones')
        .selectAll()
        .where('dispositivo_id', '=', dispositivoId.toString())
        .where('estado_sesion', '=', 'activa')
        .execute();
      return rows.map(rowToSesion);
    } catch (e) {
      throw new Err(e);
    }
  }

  async listarPotencialmenteExpiradas(ahora: FechaHora, limite: number): Promise<Sesion[]> {
    try {
      // Umbral mínimo de cierre entre todos los roles es 30 min.
      // Retornamos sesiones activas donde el tope absoluto ya se cumplió
      // O donde la inactividad supera el umbral guardado en la sesión.
      const ahoraDate = new Date(ahora.toTimestamp());
      const treintaMinutosAntes = new Date(ahora.toTimestamp() - 30 * 60 * 1000);
      const rows = await this.db
        .selectFrom('identity.sesiones')
        .selectAll()
        .where('estado_sesion', '=', 'activa')
        .where((qb) =>
          qb.or([
            qb('expira_en_absoluto', '<=', ahoraDate),
            qb('ultima_actividad_en', '<=', treintaMinutosAntes),
          ]),
        )
        .limit(limite)
        .execute();
      return rows.map(rowToSesion);
    } catch (e) {
      throw new Err(e);
    }
  }
}
