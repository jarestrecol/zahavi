import type { ColumnType, Generated } from 'kysely';

type Timestamp = ColumnType<Date, string, string>;
type NullableTimestamp = ColumnType<Date | null, string | null, string | null>;

export interface IdentityUsuariosTable {
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
  creado_en: Timestamp;
  creado_por: string | null;
}

export interface IdentitySesionesTable {
  id: string;
  usuario_id: string;
  rol: string;
  dispositivo_id: string | null;
  contexto_dispositivo: string;
  iniciada_en: Timestamp;
  ultima_actividad_en: Timestamp;
  expira_en_absoluto: Timestamp;
  estado_sesion: string;
  estado_bloqueo: string;
  bloqueada_en: NullableTimestamp;
  cerrada_en: NullableTimestamp;
  motivo_de_cierre: string | null;
  politica_umbral_bloqueo_ms: number;
  politica_umbral_cierre_ms: number;
  politica_tope_absoluto_ms: number;
  politica_limite_simultaneo: number;
  politica_requiere_dispositivo: boolean;
}

export interface IdentityDispositivosAutorizadosTable {
  id: string;
  nombre: string;
}

export interface IdentityHistorialEstadosDispositivoTable {
  id: Generated<string>;
  dispositivo_id: string;
  estado: string;
  cambiado_en: Timestamp;
  cambiado_por: string;
  motivo: string;
  orden: number;
}

export interface IdentityBusinessUnitsTable {
  id: string;
  nombre: string;
  tipo: string;
  estado: string;
  creado_en: Timestamp;
}

export interface IdentityUserBusinessUnitsTable {
  user_id: string;
  business_unit_id: string;
  asignado_en: Timestamp;
  asignado_por: string | null;
}

export interface IdentityDatabase {
  'identity.usuarios': IdentityUsuariosTable;
  'identity.sesiones': IdentitySesionesTable;
  'identity.dispositivos_autorizados': IdentityDispositivosAutorizadosTable;
  'identity.historial_estados_dispositivo': IdentityHistorialEstadosDispositivoTable;
  'identity.business_units': IdentityBusinessUnitsTable;
  'identity.user_business_units': IdentityUserBusinessUnitsTable;
}
