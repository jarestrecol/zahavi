import { type Result, ok, err, DomainError } from '@zahavi/domain-shared-kernel';
import type { IReportingRepository, ResumenCierreDeCaja, PuntoDeVentaId } from '@zahavi/ports';

/** El rango de fechas del cierre es inválido (desde > hasta). */
export class ErrorDeRangoFechas extends DomainError {
  readonly code = 'REPORTING_RANGO_FECHAS_INVALIDO';
  constructor() {
    super('La fecha de inicio debe ser anterior o igual a la fecha de fin.');
  }
}

export interface ConsultarCierreDeCajaInput {
  /** UUID del punto de venta, tomado del JWT bu_id. */
  puntoDeVentaId: PuntoDeVentaId;
  /** Fecha inicio en formato YYYY-MM-DD (America/Bogota), inclusiva. */
  desde: string;
  /** Fecha fin en formato YYYY-MM-DD (America/Bogota), inclusiva. */
  hasta: string;
}

/**
 * Query handler: genera el resumen de cierre de caja para un rango de fechas.
 * No muta estado — es un Read Model puro.
 * Errores de infraestructura propagan como excepción; solo el rango inválido retorna Result error.
 */
export class ConsultarCierreDeCaja {
  constructor(private readonly repo: IReportingRepository) {}

  async execute(
    input: ConsultarCierreDeCajaInput,
  ): Promise<Result<ResumenCierreDeCaja, ErrorDeRangoFechas>> {
    if (input.desde > input.hasta) return err(new ErrorDeRangoFechas());
    const value = await this.repo.cierreDeCaja(input.puntoDeVentaId, input.desde, input.hasta);
    return ok(value);
  }
}
