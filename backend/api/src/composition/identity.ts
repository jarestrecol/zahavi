import {
  RegistrarUsuario,
  AsignarRol,
  IniciarSesion,
  IniciarEnrolamientoTotp,
  ConfirmarTotp,
  RevocarSesion,
  CerrarSesion,
  CambiarContextoBusinessUnit,
  ListarMisSesiones,
} from '@zahavi/application';
import type { IdentityAdapters } from '@zahavi/adapter-persistence-supabase';

export interface UnidadDeNegocioItem {
  id: string;
  nombre: string;
  tipo: string;
  estado: string;
}

export interface IdentityComposition {
  registrarUsuario: RegistrarUsuario;
  asignarRol: AsignarRol;
  iniciarSesion: IniciarSesion;
  iniciarEnrolamientoTotp: IniciarEnrolamientoTotp;
  confirmarTotp: ConfirmarTotp;
  revocarSesion: RevocarSesion;
  cerrarSesion: CerrarSesion;
  cambiarContexto: CambiarContextoBusinessUnit;
  listarMisSesiones: ListarMisSesiones;
  listarUnidades: (params: { usuarioId: string }) => Promise<UnidadDeNegocioItem[]>;
}

export function createIdentityComposition(adapters: IdentityAdapters): IdentityComposition {
  const {
    repositorioDeUsuarios,
    repositorioDeSesiones,
    repositorioDeDispositivos,
    repositorioDeUnidades,
    verificadorDeContrasena,
    verificadorDePin,
    verificadorDeTotp,
    reloj,
    generadorDeIds,
    politicaPorRol,
    publicadorDeEventos,
    db,
  } = adapters;

  return {
    registrarUsuario: new RegistrarUsuario(
      repositorioDeUsuarios,
      verificadorDeContrasena,
      verificadorDePin,
      reloj,
      generadorDeIds,
      publicadorDeEventos,
    ),
    asignarRol: new AsignarRol(
      repositorioDeUsuarios,
      verificadorDeContrasena,
      verificadorDePin,
      reloj,
      generadorDeIds,
      publicadorDeEventos,
    ),
    iniciarSesion: new IniciarSesion(
      repositorioDeUsuarios,
      repositorioDeSesiones,
      repositorioDeDispositivos,
      verificadorDeContrasena,
      verificadorDePin,
      verificadorDeTotp,
      reloj,
      generadorDeIds,
      politicaPorRol,
      publicadorDeEventos,
      repositorioDeUnidades,
    ),
    iniciarEnrolamientoTotp: new IniciarEnrolamientoTotp(
      repositorioDeUsuarios,
      verificadorDeTotp,
      reloj,
      generadorDeIds,
      publicadorDeEventos,
    ),
    confirmarTotp: new ConfirmarTotp(
      repositorioDeUsuarios,
      verificadorDeTotp,
      reloj,
      generadorDeIds,
      publicadorDeEventos,
    ),
    revocarSesion: new RevocarSesion(
      repositorioDeSesiones,
      repositorioDeUsuarios,
      reloj,
      generadorDeIds,
      publicadorDeEventos,
    ),
    cerrarSesion: new CerrarSesion(
      repositorioDeSesiones,
      reloj,
      generadorDeIds,
      publicadorDeEventos,
    ),
    cambiarContexto: new CambiarContextoBusinessUnit(repositorioDeUsuarios, repositorioDeUnidades),
    listarMisSesiones: new ListarMisSesiones(repositorioDeSesiones),
    listarUnidades: async ({ usuarioId }) => {
      const rows = await db
        .selectFrom('identity.business_units as bu')
        .innerJoin('identity.user_business_units as ubu', 'ubu.business_unit_id', 'bu.id')
        .select(['bu.id', 'bu.nombre', 'bu.tipo', 'bu.estado'])
        .where('ubu.user_id', '=', usuarioId)
        .orderBy('bu.nombre')
        .execute();
      return rows;
    },
  };
}
