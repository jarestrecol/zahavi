import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type {
  RepositorioDeUsuarios,
  RepositorioDeSesiones,
  RepositorioDeDispositivosAutorizados,
  RepositorioDeUnidadesDeNegocio,
  VerificadorDeContrasena,
  VerificadorDePin,
  VerificadorDeTotp,
  Reloj,
  GeneradorDeIds,
  PoliticaDeSesionPorRol,
  PublicadorDeDomainEvents,
} from '@zahavi/ports';
import type { IdentityDatabase } from './schema.js';
import { RepositorioDeUsuariosSupabase } from './RepositorioDeUsuariosSupabase.js';
import { RepositorioDeSesionesSupabase } from './RepositorioDeSesionesSupabase.js';
import { RepositorioDeDispositivosSupabase } from './RepositorioDeDispositivosSupabase.js';
import { RepositorioDeUnidadesSupabase } from './RepositorioDeUnidadesSupabase.js';
import { VerificadorDeContrasenaBcrypt } from './VerificadorDeContrasenaBcrypt.js';
import { VerificadorDePinBcrypt } from './VerificadorDePinBcrypt.js';
import { VerificadorDeTotpOtplib } from './VerificadorDeTotpOtplib.js';
import { RelojSistema } from './RelojSistema.js';
import { GeneradorDeIdsUuid } from './GeneradorDeIdsUuid.js';
import { PoliticaDeSesionPorRolDefecto } from './PoliticaDeSesionPorRolDefecto.js';
import { PublicadorDeEventosNoop } from './PublicadorDeEventosNoop.js';

export interface IdentityAdapters {
  repositorioDeUsuarios: RepositorioDeUsuarios;
  repositorioDeSesiones: RepositorioDeSesiones;
  repositorioDeDispositivos: RepositorioDeDispositivosAutorizados;
  repositorioDeUnidades: RepositorioDeUnidadesDeNegocio;
  verificadorDeContrasena: VerificadorDeContrasena;
  verificadorDePin: VerificadorDePin;
  verificadorDeTotp: VerificadorDeTotp;
  reloj: Reloj;
  generadorDeIds: GeneradorDeIds;
  politicaPorRol: PoliticaDeSesionPorRol;
  publicadorDeEventos: PublicadorDeDomainEvents;
  db: Kysely<IdentityDatabase>;
}

export function createIdentityAdapters(pool: Pool): IdentityAdapters {
  const db = new Kysely<IdentityDatabase>({
    dialect: new PostgresDialect({ pool }),
  });

  return {
    repositorioDeUsuarios: new RepositorioDeUsuariosSupabase(db),
    repositorioDeSesiones: new RepositorioDeSesionesSupabase(db),
    repositorioDeDispositivos: new RepositorioDeDispositivosSupabase(db),
    repositorioDeUnidades: new RepositorioDeUnidadesSupabase(db),
    verificadorDeContrasena: new VerificadorDeContrasenaBcrypt(),
    verificadorDePin: new VerificadorDePinBcrypt(),
    verificadorDeTotp: new VerificadorDeTotpOtplib(),
    reloj: new RelojSistema(),
    generadorDeIds: new GeneradorDeIdsUuid(),
    politicaPorRol: new PoliticaDeSesionPorRolDefecto(),
    publicadorDeEventos: new PublicadorDeEventosNoop(),
    db,
  };
}
