import type { DispositivoAutorizado, DispositivoId } from '@zahavi/domain-identity';

/**
 * Puerto de salida para persistir y consultar dispositivos autorizados (tablets de punto de venta).
 *
 * Todas las operaciones son multi-tenant: la implementación filtra por `business_unit_id`
 * derivado del contexto de ejecución, nunca del caller.
 */
export interface RepositorioDeDispositivosAutorizados {
  /**
   * Busca un dispositivo por su identidad.
   * @returns El dispositivo o `null` si no existe o no pertenece al tenant activo.
   */
  obtenerPorId(id: DispositivoId): Promise<DispositivoAutorizado | null>;

  /**
   * Persiste un dispositivo nuevo o actualiza uno existente (upsert por `id`).
   * @param dispositivo - Aggregate con eventos pendientes que deben publicarse tras guardar.
   */
  guardar(dispositivo: DispositivoAutorizado): Promise<void>;

  /**
   * Verifica si ya existe un dispositivo con ese nombre en el tenant activo.
   * Útil para validar unicidad antes de crear.
   */
  existeNombre(nombre: string): Promise<boolean>;

  /** Lista todos los dispositivos en estado `activo` del tenant activo. */
  listarActivos(): Promise<DispositivoAutorizado[]>;

  /**
   * Comprueba si un dispositivo está activo sin cargar el aggregate completo.
   * Optimización para el middleware de autenticación de tablets.
   */
  estaActivo(id: DispositivoId): Promise<boolean>;
}
