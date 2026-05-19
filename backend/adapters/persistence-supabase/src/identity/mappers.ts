import {
  Usuario,
  Sesion,
  DispositivoAutorizado,
  UsuarioId,
  SesionId,
  DispositivoId,
  Email,
  NombreCompleto,
  FechaHora,
  Duracion,
  PoliticaDeSesion,
  HashDeContrasena,
  HashDePin,
  SecretoTotp,
  type Credencial,
  type Rol,
  type EstadoDeSesion,
  type EstadoDeBloqueo,
  type ContextoDeDispositivo,
  type MotivoDeRevocacionDeSesion,
  type CambioDeEstadoDispositivo,
} from '@zahavi/domain-identity';
import type { Selectable } from 'kysely';
import type {
  IdentityUsuariosTable,
  IdentitySesionesTable,
  IdentityDispositivosAutorizadosTable,
  IdentityHistorialEstadosDispositivoTable,
} from './schema.js';

type UsuarioRow = Selectable<IdentityUsuariosTable>;
type SesionRow = Selectable<IdentitySesionesTable>;
type DispositivoRow = Selectable<IdentityDispositivosAutorizadosTable>;
type HistorialRow = Selectable<IdentityHistorialEstadosDispositivoTable>;

function toFechaHora(date: Date): FechaHora {
  return FechaHora.deTimestamp(date.getTime());
}

function toNullableFechaHora(date: Date | null): FechaHora | null {
  return date !== null ? toFechaHora(date) : null;
}

export function rowToUsuario(row: UsuarioRow): Usuario {
  const emailResult = Email.of(row.email);
  if (!emailResult.ok) throw new Error(`Dato corrupto en identity.usuarios.email: ${row.id}`);

  const nombreResult = NombreCompleto.of(row.nombre_completo);
  if (!nombreResult.ok)
    throw new Error(`Dato corrupto en identity.usuarios.nombre_completo: ${row.id}`);

  let credencial: Credencial;
  if (row.tipo_credencial === 'navegador') {
    if (!row.hash_contrasena)
      throw new Error(`DB: hash_contrasena null para usuario navegador ${row.id}`);
    credencial = {
      tipo: 'navegador',
      hashDeContrasena: HashDeContrasena.deCadenaYaHasheada(row.hash_contrasena),
      secretoTotp: row.secreto_totp !== null ? SecretoTotp.de(row.secreto_totp) : null,
      totpVerificado: row.totp_verificado,
    };
  } else {
    if (!row.hash_pin) throw new Error(`DB: hash_pin null para usuario tablet ${row.id}`);
    credencial = {
      tipo: 'tablet',
      hashDePin: HashDePin.deCadenaYaHasheada(row.hash_pin),
    };
  }

  return Usuario.reconstituir({
    id: UsuarioId.of(row.id),
    email: emailResult.value,
    nombre: nombreResult.value,
    rol: row.rol as Rol,
    estado: row.estado as 'activo' | 'deshabilitado',
    credencial,
    creadoEn: toFechaHora(row.creado_en),
    creadoPor: row.creado_por !== null ? UsuarioId.of(row.creado_por) : null,
  });
}

export function usuarioToRow(usuario: Usuario): {
  id: string;
  email: string;
  nombre_completo: string;
  rol: string;
  estado: string;
  tipo_credencial: string;
  hash_contrasena: string | null;
  secreto_totp: string | null;
  totp_verificado: boolean;
  hash_pin: string | null;
  creado_en: string;
  creado_por: string | null;
} {
  const cred = usuario.credencial;
  return {
    id: usuario.id.toString(),
    email: usuario.email.toString(),
    nombre_completo: usuario.nombre.toString(),
    rol: usuario.rol,
    estado: usuario.estado,
    tipo_credencial: cred.tipo,
    hash_contrasena: cred.tipo === 'navegador' ? cred.hashDeContrasena.toString() : null,
    secreto_totp:
      cred.tipo === 'navegador' && cred.secretoTotp !== null
        ? cred.secretoTotp._unsafeRead()
        : null,
    totp_verificado: cred.tipo === 'navegador' ? cred.totpVerificado : false,
    hash_pin: cred.tipo === 'tablet' ? cred.hashDePin.toString() : null,
    creado_en: new Date(usuario.creadoEn.toTimestamp()).toISOString(),
    creado_por: usuario.creadoPor !== null ? usuario.creadoPor.toString() : null,
  };
}

export function rowToSesion(row: SesionRow): Sesion {
  const politica = PoliticaDeSesion.de({
    umbralBloqueo: Duracion.deSegundos(row.politica_umbral_bloqueo_ms / 1000),
    umbralCierre: Duracion.deSegundos(row.politica_umbral_cierre_ms / 1000),
    topeAbsoluto: Duracion.deSegundos(row.politica_tope_absoluto_ms / 1000),
    limiteSimultaneo: row.politica_limite_simultaneo,
    requiereDispositivoAutorizado: row.politica_requiere_dispositivo,
  });

  return Sesion.reconstituir({
    id: SesionId.of(row.id),
    usuarioId: UsuarioId.of(row.usuario_id),
    rol: row.rol as Rol,
    dispositivoId: row.dispositivo_id !== null ? DispositivoId.of(row.dispositivo_id) : null,
    politica,
    contextoDispositivo: row.contexto_dispositivo as ContextoDeDispositivo,
    iniciadaEn: toFechaHora(row.iniciada_en),
    ultimaActividadEn: toFechaHora(row.ultima_actividad_en),
    expiraEnAbsoluto: toFechaHora(row.expira_en_absoluto),
    estadoSesion: row.estado_sesion as EstadoDeSesion,
    estadoBloqueo: row.estado_bloqueo as EstadoDeBloqueo,
    bloqueadaEn: toNullableFechaHora(row.bloqueada_en),
    cerradaEn: toNullableFechaHora(row.cerrada_en),
    motivoDeCierre: row.motivo_de_cierre as MotivoDeRevocacionDeSesion | null,
  });
}

export function sesionToRow(sesion: Sesion): {
  id: string;
  usuario_id: string;
  rol: string;
  dispositivo_id: string | null;
  contexto_dispositivo: string;
  iniciada_en: string;
  ultima_actividad_en: string;
  expira_en_absoluto: string;
  estado_sesion: string;
  estado_bloqueo: string;
  bloqueada_en: string | null;
  cerrada_en: string | null;
  motivo_de_cierre: string | null;
  politica_umbral_bloqueo_ms: number;
  politica_umbral_cierre_ms: number;
  politica_tope_absoluto_ms: number;
  politica_limite_simultaneo: number;
  politica_requiere_dispositivo: boolean;
} {
  return {
    id: sesion.id.toString(),
    usuario_id: sesion.usuarioId.toString(),
    rol: sesion.rol,
    dispositivo_id: sesion.dispositivoId !== null ? sesion.dispositivoId.toString() : null,
    contexto_dispositivo: sesion.contextoDispositivo,
    iniciada_en: new Date(sesion.iniciadaEn.toTimestamp()).toISOString(),
    ultima_actividad_en: new Date(sesion.ultimaActividadEn.toTimestamp()).toISOString(),
    expira_en_absoluto: new Date(sesion.expiraEnAbsoluto.toTimestamp()).toISOString(),
    estado_sesion: sesion.estadoSesion,
    estado_bloqueo: sesion.estadoBloqueo,
    bloqueada_en:
      sesion.bloqueadaEn !== null ? new Date(sesion.bloqueadaEn.toTimestamp()).toISOString() : null,
    cerrada_en:
      sesion.cerradaEn !== null ? new Date(sesion.cerradaEn.toTimestamp()).toISOString() : null,
    motivo_de_cierre: sesion.motivoDeCierre,
    politica_umbral_bloqueo_ms: sesion.politica.umbralBloqueo.toMs(),
    politica_umbral_cierre_ms: sesion.politica.umbralCierre.toMs(),
    politica_tope_absoluto_ms: sesion.politica.topeAbsoluto.toMs(),
    politica_limite_simultaneo: sesion.politica.limiteSimultaneo,
    politica_requiere_dispositivo: sesion.politica.requiereDispositivoAutorizado,
  };
}

export function rowsToDispositivo(
  deviceRow: DispositivoRow,
  historialRows: HistorialRow[],
): DispositivoAutorizado {
  const historialOrdenado = [...historialRows].sort((a, b) => a.orden - b.orden);
  const historial: CambioDeEstadoDispositivo[] = historialOrdenado.map((h) => ({
    estado: h.estado as 'activo' | 'revocado',
    cambiadoEn: toFechaHora(h.cambiado_en),
    cambiadoPor: UsuarioId.of(h.cambiado_por),
    motivo: h.motivo,
  }));

  return DispositivoAutorizado.reconstituir({
    id: DispositivoId.of(deviceRow.id),
    nombre: deviceRow.nombre,
    historialDeEstados: historial,
  });
}

export function dispositivoToRows(dispositivo: DispositivoAutorizado): {
  device: { id: string; nombre: string };
  historial: Array<{
    dispositivo_id: string;
    estado: string;
    cambiado_en: string;
    cambiado_por: string;
    motivo: string;
    orden: number;
  }>;
} {
  const dispositivoId = dispositivo.id.toString();
  const historial = dispositivo.historialDeEstados.map((h, idx) => ({
    dispositivo_id: dispositivoId,
    estado: h.estado,
    cambiado_en: new Date(h.cambiadoEn.toTimestamp()).toISOString(),
    cambiado_por: h.cambiadoPor.toString(),
    motivo: h.motivo,
    orden: idx,
  }));

  return {
    device: { id: dispositivoId, nombre: dispositivo.nombre },
    historial,
  };
}
