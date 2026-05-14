import {
  RegistrarUsuario,
  AsignarRol,
  IniciarSesion,
  IniciarEnrolamientoTotp,
  ConfirmarTotp,
  RevocarSesion,
  CerrarSesion,
  CambiarContextoBusinessUnit,
} from '@zahavi/application';
import type { IdentityAdapters } from '@zahavi/adapter-persistence-supabase';

export interface IdentityComposition {
  registrarUsuario: RegistrarUsuario;
  asignarRol: AsignarRol;
  iniciarSesion: IniciarSesion;
  iniciarEnrolamientoTotp: IniciarEnrolamientoTotp;
  confirmarTotp: ConfirmarTotp;
  revocarSesion: RevocarSesion;
  cerrarSesion: CerrarSesion;
  cambiarContexto: CambiarContextoBusinessUnit;
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
  };
}
