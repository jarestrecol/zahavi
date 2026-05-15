// ──────────────────────────────────────────────────────────────────────────────
// Tipos opacos
// ──────────────────────────────────────────────────────────────────────────────

/** UUID opaco de un punto de venta (business unit de tipo 'punto_de_venta'). */
export type PuntoDeVentaId = string & { readonly _brand: 'PuntoDeVentaId' };

// ──────────────────────────────────────────────────────────────────────────────
// DTOs — resultados de las queries de reporting (solo lectura, sin dominio)
// ──────────────────────────────────────────────────────────────────────────────

/** Desglose de ventas por método de pago para un período. */
export interface VentaPorMetodo {
  metodo: string;
  total: number;
  numeroCobros: number;
}

/** Ventas agrupadas por hora del día (0–23, hora colombiana). */
export interface VentaPorHora {
  hora: number;
  total: number;
  numeroCobros: number;
}

/** KPIs del día visible en el dashboard principal. */
export interface DashboardDelDia {
  /** Fecha en formato YYYY-MM-DD (zona America/Bogota). */
  fecha: string;
  /** Suma de total_cobrado de cobros PROCESADOS del día, en COP. */
  totalVentas: number;
  /** Número de cobros PROCESADOS del día. */
  numeroCobros: number;
  /** Promedio de total_cobrado por cobro PROCESADO; 0 si no hay cobros. */
  ticketPromedio: number;
  /** Desglose de ventas por método de pago. */
  porMetodo: VentaPorMetodo[];
  /** Ventas agrupadas por hora del día. */
  porHora: VentaPorHora[];
  /** Número de facturas EMITIDAS del día. */
  facturasEmitidas: number;
}

/** Resumen de cierre de caja para un rango de fechas (zona America/Bogota). */
export interface ResumenCierreDeCaja {
  /** Fecha de inicio en formato YYYY-MM-DD. */
  desde: string;
  /** Fecha de fin en formato YYYY-MM-DD. */
  hasta: string;
  /** Suma total de cobros PROCESADOS en COP. */
  totalVentas: number;
  /** Número de cobros PROCESADOS en el período. */
  numeroCobros: number;
  /** Desglose por método de pago. */
  porMetodo: VentaPorMetodo[];
  /** Número de facturas EMITIDAS en el período. */
  facturasEmitidas: number;
  /** Suma de total_iva de facturas EMITIDAS en el período, en COP. */
  totalIva: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Port
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Puerto de solo lectura para reportes y dashboard del POS.
 * Implementado por un Read Model que agrega directamente sobre las tablas de sales.
 */
export interface IReportingRepository {
  /**
   * Retorna los KPIs del día para el punto de venta indicado.
   * @param puntoDeVentaId UUID del punto de venta (del JWT bu_id).
   * @param fechaBogota Fecha en formato YYYY-MM-DD en zona America/Bogota.
   */
  dashboardDelDia(puntoDeVentaId: PuntoDeVentaId, fechaBogota: string): Promise<DashboardDelDia>;

  /**
   * Retorna el resumen de cierre de caja para un rango de fechas.
   * @param puntoDeVentaId UUID del punto de venta.
   * @param desde Fecha inicio YYYY-MM-DD (inclusiva).
   * @param hasta Fecha fin YYYY-MM-DD (inclusiva).
   */
  cierreDeCaja(
    puntoDeVentaId: PuntoDeVentaId,
    desde: string,
    hasta: string,
  ): Promise<ResumenCierreDeCaja>;
}
