import { sql, type Kysely } from 'kysely';
import type {
  IReportingRepository,
  DashboardDelDia,
  ResumenCierreDeCaja,
  VentaPorMetodo,
  VentaPorHora,
} from '@zahavi/ports';
import type { SalesDatabase } from '../sales/schema.js';

interface TotalesRow {
  total_ventas: string | null;
  numero_cobros: string;
}

interface MetodoRow {
  metodo: string;
  total: string;
  numero_cobros: string;
}

interface HoraRow {
  hora: string;
  total: string;
  numero_cobros: string;
}

interface FacturasRow {
  facturas_emitidas: string;
  total_iva: string | null;
}

/**
 * Read Model de reportes sobre las tablas sales.* usando agregaciones SQL.
 * No modifica estado — únicamente SELECT.
 */
export class ReportingRepositorySupabase implements IReportingRepository {
  // Los tipos genéricos de Kysely no afectan el uso de sql`...` — se usa
  // el pool subyacente para ejecutar el SQL parametrizado con seguridad.
  constructor(private readonly db: Kysely<SalesDatabase>) {}

  async dashboardDelDia(puntoDeVentaId: string, fechaBogota: string): Promise<DashboardDelDia> {
    const [totales, porMetodo, porHora, facturas] = await Promise.all([
      this.queryTotalesDia(puntoDeVentaId, fechaBogota),
      this.queryPorMetodoDia(puntoDeVentaId, fechaBogota),
      this.queryPorHoraDia(puntoDeVentaId, fechaBogota),
      this.queryFacturasDia(puntoDeVentaId, fechaBogota),
    ]);

    const totalVentas = Number(totales.total_ventas ?? 0);
    const numeroCobros = Number(totales.numero_cobros);

    return {
      fecha: fechaBogota,
      totalVentas,
      numeroCobros,
      ticketPromedio: numeroCobros > 0 ? Math.round(totalVentas / numeroCobros) : 0,
      porMetodo: porMetodo.map(toVentaPorMetodo),
      porHora: porHora.map(toVentaPorHora),
      facturasEmitidas: Number(facturas.facturas_emitidas),
    };
  }

  async cierreDeCaja(
    puntoDeVentaId: string,
    desde: string,
    hasta: string,
  ): Promise<ResumenCierreDeCaja> {
    const [totales, porMetodo, facturas] = await Promise.all([
      this.queryTotalesRango(puntoDeVentaId, desde, hasta),
      this.queryPorMetodoRango(puntoDeVentaId, desde, hasta),
      this.queryFacturasRango(puntoDeVentaId, desde, hasta),
    ]);

    return {
      desde,
      hasta,
      totalVentas: Number(totales.total_ventas ?? 0),
      numeroCobros: Number(totales.numero_cobros),
      porMetodo: porMetodo.map(toVentaPorMetodo),
      facturasEmitidas: Number(facturas.facturas_emitidas),
      totalIva: Number(facturas.total_iva ?? 0),
    };
  }

  // ── Helpers de queries ────────────────────────────────────────────────────

  private async queryTotalesDia(buId: string, fecha: string): Promise<TotalesRow> {
    const result = await sql<TotalesRow>`
      SELECT
        SUM(total_cobrado)::text AS total_ventas,
        COUNT(*)::text           AS numero_cobros
      FROM sales.cobros
      WHERE estado            = 'PROCESADO'
        AND punto_de_venta_id = ${buId}::uuid
        AND DATE(procesado_en AT TIME ZONE 'America/Bogota') = ${fecha}::date
    `.execute(this.db);
    return result.rows[0] ?? { total_ventas: null, numero_cobros: '0' };
  }

  private async queryPorMetodoDia(buId: string, fecha: string): Promise<MetodoRow[]> {
    const result = await sql<MetodoRow>`
      SELECT
        elem->>'metodo'                  AS metodo,
        SUM((elem->>'monto')::int)::text AS total,
        COUNT(*)::text                   AS numero_cobros
      FROM sales.cobros,
        jsonb_array_elements(pagos) AS elem
      WHERE estado            = 'PROCESADO'
        AND punto_de_venta_id = ${buId}::uuid
        AND DATE(procesado_en AT TIME ZONE 'America/Bogota') = ${fecha}::date
      GROUP BY elem->>'metodo'
      ORDER BY SUM((elem->>'monto')::int) DESC
    `.execute(this.db);
    return result.rows;
  }

  private async queryPorHoraDia(buId: string, fecha: string): Promise<HoraRow[]> {
    const result = await sql<HoraRow>`
      SELECT
        EXTRACT(HOUR FROM procesado_en AT TIME ZONE 'America/Bogota')::text AS hora,
        SUM(total_cobrado)::text                                             AS total,
        COUNT(*)::text                                                       AS numero_cobros
      FROM sales.cobros
      WHERE estado            = 'PROCESADO'
        AND punto_de_venta_id = ${buId}::uuid
        AND DATE(procesado_en AT TIME ZONE 'America/Bogota') = ${fecha}::date
      GROUP BY EXTRACT(HOUR FROM procesado_en AT TIME ZONE 'America/Bogota')
      ORDER BY hora
    `.execute(this.db);
    return result.rows;
  }

  private async queryFacturasDia(buId: string, fecha: string): Promise<FacturasRow> {
    const result = await sql<FacturasRow>`
      SELECT
        COUNT(*)::text        AS facturas_emitidas,
        SUM(total_iva)::text  AS total_iva
      FROM sales.facturas
      WHERE estado            = 'EMITIDA'
        AND punto_de_venta_id = ${buId}::uuid
        AND DATE(emitida_en AT TIME ZONE 'America/Bogota') = ${fecha}::date
    `.execute(this.db);
    return result.rows[0] ?? { facturas_emitidas: '0', total_iva: null };
  }

  private async queryTotalesRango(buId: string, desde: string, hasta: string): Promise<TotalesRow> {
    const result = await sql<TotalesRow>`
      SELECT
        SUM(total_cobrado)::text AS total_ventas,
        COUNT(*)::text           AS numero_cobros
      FROM sales.cobros
      WHERE estado            = 'PROCESADO'
        AND punto_de_venta_id = ${buId}::uuid
        AND DATE(procesado_en AT TIME ZONE 'America/Bogota') BETWEEN ${desde}::date AND ${hasta}::date
    `.execute(this.db);
    return result.rows[0] ?? { total_ventas: null, numero_cobros: '0' };
  }

  private async queryPorMetodoRango(
    buId: string,
    desde: string,
    hasta: string,
  ): Promise<MetodoRow[]> {
    const result = await sql<MetodoRow>`
      SELECT
        elem->>'metodo'                  AS metodo,
        SUM((elem->>'monto')::int)::text AS total,
        COUNT(*)::text                   AS numero_cobros
      FROM sales.cobros,
        jsonb_array_elements(pagos) AS elem
      WHERE estado            = 'PROCESADO'
        AND punto_de_venta_id = ${buId}::uuid
        AND DATE(procesado_en AT TIME ZONE 'America/Bogota') BETWEEN ${desde}::date AND ${hasta}::date
      GROUP BY elem->>'metodo'
      ORDER BY SUM((elem->>'monto')::int) DESC
    `.execute(this.db);
    return result.rows;
  }

  private async queryFacturasRango(
    buId: string,
    desde: string,
    hasta: string,
  ): Promise<FacturasRow> {
    const result = await sql<FacturasRow>`
      SELECT
        COUNT(*)::text        AS facturas_emitidas,
        SUM(total_iva)::text  AS total_iva
      FROM sales.facturas
      WHERE estado            = 'EMITIDA'
        AND punto_de_venta_id = ${buId}::uuid
        AND DATE(emitida_en AT TIME ZONE 'America/Bogota') BETWEEN ${desde}::date AND ${hasta}::date
    `.execute(this.db);
    return result.rows[0] ?? { facturas_emitidas: '0', total_iva: null };
  }
}

function toVentaPorMetodo(row: MetodoRow): VentaPorMetodo {
  return {
    metodo: row.metodo,
    total: Number(row.total),
    numeroCobros: Number(row.numero_cobros),
  };
}

function toVentaPorHora(row: HoraRow): VentaPorHora {
  return {
    hora: Number(row.hora),
    total: Number(row.total),
    numeroCobros: Number(row.numero_cobros),
  };
}
