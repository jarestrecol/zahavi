import type { Kysely } from 'kysely';
import type { RepositorioDeUsuarios } from '@zahavi/ports';
import type { Usuario, UsuarioId, Email, Rol } from '@zahavi/domain-identity';
import { RepositorioNoDisponibleError as Err } from '@zahavi/ports';
import type { IdentityDatabase } from './schema.js';
import { rowToUsuario, usuarioToRow } from './mappers.js';

export class RepositorioDeUsuariosSupabase implements RepositorioDeUsuarios {
  constructor(private readonly db: Kysely<IdentityDatabase>) {}

  async obtenerPorId(id: UsuarioId): Promise<Usuario | null> {
    try {
      const row = await this.db
        .selectFrom('identity.usuarios')
        .selectAll()
        .where('id', '=', id.toString())
        .executeTakeFirst();
      return row !== undefined ? rowToUsuario(row) : null;
    } catch (e) {
      throw new Err(e);
    }
  }

  async obtenerPorEmail(email: Email): Promise<Usuario | null> {
    try {
      const row = await this.db
        .selectFrom('identity.usuarios')
        .selectAll()
        .where('email', '=', email.toString())
        .executeTakeFirst();
      return row !== undefined ? rowToUsuario(row) : null;
    } catch (e) {
      throw new Err(e);
    }
  }

  async existeEmail(email: Email): Promise<boolean> {
    try {
      const row = await this.db
        .selectFrom('identity.usuarios')
        .select('id')
        .where('email', '=', email.toString())
        .executeTakeFirst();
      return row !== undefined;
    } catch (e) {
      throw new Err(e);
    }
  }

  async guardar(usuario: Usuario): Promise<void> {
    try {
      const row = usuarioToRow(usuario);
      await this.db
        .insertInto('identity.usuarios')
        .values(row)
        .onConflict((oc) => oc.column('id').doUpdateSet(row))
        .execute();
    } catch (e) {
      throw new Err(e);
    }
  }

  async contarSuperadminsActivos(): Promise<number> {
    try {
      const result = await this.db
        .selectFrom('identity.usuarios')
        .select((eb) => eb.fn.countAll<number>().as('total'))
        .where('rol', '=', 'SUPERADMIN')
        .where('estado', '=', 'activo')
        .executeTakeFirstOrThrow();
      return Number(result.total);
    } catch (e) {
      throw new Err(e);
    }
  }

  async listarSuperadminsActivos(): Promise<UsuarioId[]> {
    try {
      const rows = await this.db
        .selectFrom('identity.usuarios')
        .select('id')
        .where('rol', '=', 'SUPERADMIN')
        .where('estado', '=', 'activo')
        .execute();
      const { UsuarioId } = await import('@zahavi/domain-identity');
      return rows.map((r) => UsuarioId.of(r.id));
    } catch (e) {
      throw new Err(e);
    }
  }

  async listar(filtro: { rol?: Rol; estado?: 'activo' | 'deshabilitado' }): Promise<Usuario[]> {
    try {
      let query = this.db.selectFrom('identity.usuarios').selectAll();
      if (filtro.rol !== undefined) query = query.where('rol', '=', filtro.rol);
      if (filtro.estado !== undefined) query = query.where('estado', '=', filtro.estado);
      const rows = await query.execute();
      return rows.map(rowToUsuario);
    } catch (e) {
      throw new Err(e);
    }
  }
}
