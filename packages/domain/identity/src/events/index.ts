import { type Rol, type MotivoDeRevocacionDeSesion } from '../value-objects/enums.js';

export interface DomainEvent {
  readonly eventoId: string;
  readonly tipo: string;
  readonly aggregateId: string;
  readonly ocurridoEn: number; // timestamp ms
  readonly version: number;
}

// ──────────────────────────────────────────────────────────────
// Eventos de Usuario
// ──────────────────────────────────────────────────────────────

export interface UsuarioCreadoEvent extends DomainEvent {
  readonly tipo: 'UsuarioCreado';
  readonly payload: {
    readonly usuarioId: string;
    readonly email: string;
    readonly nombre: string;
    readonly rol: Rol;
    readonly creadoPor: string | null;
  };
}

export interface RolDeUsuarioCambiadoEvent extends DomainEvent {
  readonly tipo: 'RolDeUsuarioCambiado';
  readonly payload: {
    readonly usuarioId: string;
    readonly rolAnterior: Rol;
    readonly rolNuevo: Rol;
    readonly cambiadoPor: string;
  };
}

export interface UsuarioDeshabilitadoEvent extends DomainEvent {
  readonly tipo: 'UsuarioDeshabilitado';
  readonly payload: {
    readonly usuarioId: string;
    readonly deshabilitadoPor: string;
    readonly motivo: string;
  };
}

export interface UsuarioRehabilitadoEvent extends DomainEvent {
  readonly tipo: 'UsuarioRehabilitado';
  readonly payload: {
    readonly usuarioId: string;
    readonly rehabilitadoPor: string;
  };
}

export interface ContrasenaDeUsuarioCambiadaEvent extends DomainEvent {
  readonly tipo: 'ContrasenaDeUsuarioCambiada';
  readonly payload: { readonly usuarioId: string };
}

export interface PinDeUsuarioCambiadoEvent extends DomainEvent {
  readonly tipo: 'PinDeUsuarioCambiado';
  readonly payload: { readonly usuarioId: string };
}

export interface TotpDeUsuarioVerificadoEvent extends DomainEvent {
  readonly tipo: 'TotpDeUsuarioVerificado';
  readonly payload: { readonly usuarioId: string };
}

export interface SecretoTotpRegeneradoEvent extends DomainEvent {
  readonly tipo: 'SecretoTotpRegenerado';
  readonly payload: { readonly usuarioId: string };
}

// ──────────────────────────────────────────────────────────────
// Eventos de Sesion
// ──────────────────────────────────────────────────────────────

export interface SesionAbiertaEvent extends DomainEvent {
  readonly tipo: 'SesionAbierta';
  readonly payload: {
    readonly sesionId: string;
    readonly usuarioId: string;
    readonly rol: Rol;
    readonly dispositivoId: string | null;
    readonly expiraEnAbsolutoMs: number;
    readonly umbralCierreMs: number;
  };
}

export interface PantallaBloqueadaEvent extends DomainEvent {
  readonly tipo: 'PantallaBloqueada';
  readonly payload: { readonly sesionId: string; readonly usuarioId: string };
}

export interface PantallaDesbloqueadaEvent extends DomainEvent {
  readonly tipo: 'PantallaDesbloqueada';
  readonly payload: { readonly sesionId: string; readonly usuarioId: string };
}

export interface SesionCerradaEvent extends DomainEvent {
  readonly tipo: 'SesionCerrada';
  readonly payload: { readonly sesionId: string; readonly usuarioId: string };
}

export interface SesionExpiradaPorInactividadEvent extends DomainEvent {
  readonly tipo: 'SesionExpiradaPorInactividad';
  readonly payload: {
    readonly sesionId: string;
    readonly usuarioId: string;
    readonly ultimaActividadEnMs: number;
  };
}

export interface SesionExpiradaPorTopeAbsolutoEvent extends DomainEvent {
  readonly tipo: 'SesionExpiradaPorTopeAbsoluto';
  readonly payload: {
    readonly sesionId: string;
    readonly usuarioId: string;
    readonly iniciadaEnMs: number;
  };
}

export interface SesionRevocadaEvent extends DomainEvent {
  readonly tipo: 'SesionRevocada';
  readonly payload: {
    readonly sesionId: string;
    readonly usuarioId: string;
    readonly motivo: MotivoDeRevocacionDeSesion;
    readonly revocadaPor: string | null;
  };
}

export interface SesionCerradaConMesaAbiertaEvent extends DomainEvent {
  readonly tipo: 'SesionCerradaConMesaAbierta';
  readonly payload: {
    readonly sesionId: string;
    readonly usuarioId: string;
    readonly unidadId: string;
    readonly mesasAbiertas: string[];
  };
}

// ──────────────────────────────────────────────────────────────
// Eventos de DispositivoAutorizado
// ──────────────────────────────────────────────────────────────

export interface DispositivoAutorizadoCreadoEvent extends DomainEvent {
  readonly tipo: 'DispositivoAutorizadoCreado';
  readonly payload: {
    readonly dispositivoId: string;
    readonly nombre: string;
    readonly autorizadoPor: string;
  };
}

export interface DispositivoRevocadoEvent extends DomainEvent {
  readonly tipo: 'DispositivoRevocado';
  readonly payload: {
    readonly dispositivoId: string;
    readonly revocadoPor: string;
    readonly motivo: string;
  };
}

export interface DispositivoReautorizadoEvent extends DomainEvent {
  readonly tipo: 'DispositivoReautorizado';
  readonly payload: {
    readonly dispositivoId: string;
    readonly reautorizadoPor: string;
    readonly motivo: string;
  };
}

export interface DispositivoRenombradoEvent extends DomainEvent {
  readonly tipo: 'DispositivoRenombrado';
  readonly payload: {
    readonly dispositivoId: string;
    readonly nombreAnterior: string;
    readonly nombreNuevo: string;
  };
}

export type IdentityDomainEvent =
  | UsuarioCreadoEvent
  | RolDeUsuarioCambiadoEvent
  | UsuarioDeshabilitadoEvent
  | UsuarioRehabilitadoEvent
  | ContrasenaDeUsuarioCambiadaEvent
  | PinDeUsuarioCambiadoEvent
  | TotpDeUsuarioVerificadoEvent
  | SecretoTotpRegeneradoEvent
  | SesionAbiertaEvent
  | PantallaBloqueadaEvent
  | PantallaDesbloqueadaEvent
  | SesionCerradaEvent
  | SesionExpiradaPorInactividadEvent
  | SesionExpiradaPorTopeAbsolutoEvent
  | SesionRevocadaEvent
  | SesionCerradaConMesaAbiertaEvent
  | DispositivoAutorizadoCreadoEvent
  | DispositivoRevocadoEvent
  | DispositivoReautorizadoEvent
  | DispositivoRenombradoEvent;
