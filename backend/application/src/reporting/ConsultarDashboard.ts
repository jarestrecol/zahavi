import { type Result, ok } from '@zahavi/domain-shared-kernel';
import type { IReportingRepository, DashboardDelDia, PuntoDeVentaId } from '@zahavi/ports';

export interface ConsultarDashboardInput {
  /** UUID del punto de venta, tomado del JWT bu_id. */
  puntoDeVentaId: PuntoDeVentaId;
  /**
   * Fecha en formato YYYY-MM-DD (zona America/Bogota).
   * Si se omite, se usa la fecha actual del servidor en zona America/Bogota.
   */
  fecha?: string;
}

/**
 * Query handler: retorna los KPIs del día para el dashboard principal.
 * No muta estado — es un Read Model puro.
 * Errores de infraestructura (BD caída) propagan como excepción, no como Result.
 */
export class ConsultarDashboard {
  constructor(private readonly repo: IReportingRepository) {}

  async execute(input: ConsultarDashboardInput): Promise<Result<DashboardDelDia>> {
    const fecha = input.fecha ?? fechaHoyEnBogota();
    const value = await this.repo.dashboardDelDia(input.puntoDeVentaId, fecha);
    return ok(value);
  }
}

function fechaHoyEnBogota(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }); // YYYY-MM-DD
}
