import { describe, it, expect, vi } from 'vitest';
import {
  ConsultarCierreDeCaja,
  ErrorDeRangoFechas,
} from '../../reporting/ConsultarCierreDeCaja.js';
import type { IReportingRepository, ResumenCierreDeCaja } from '@zahavi/ports';

function buildRepo(overrides: Partial<IReportingRepository> = {}): IReportingRepository {
  return {
    dashboardDelDia: vi.fn().mockResolvedValue({}),
    cierreDeCaja: vi.fn().mockResolvedValue(cierreVacio()),
    ...overrides,
  };
}

function cierreVacio(): ResumenCierreDeCaja {
  return {
    desde: '2026-05-01',
    hasta: '2026-05-14',
    totalVentas: 0,
    numeroCobros: 0,
    porMetodo: [],
    facturasEmitidas: 0,
    totalIva: 0,
  };
}

describe('ConsultarCierreDeCaja', () => {
  it('retorna ok cuando el repo responde correctamente', async () => {
    const repo = buildRepo();
    const uc = new ConsultarCierreDeCaja(repo);

    const result = await uc.execute({
      puntoDeVentaId: 'bu-1',
      desde: '2026-05-01',
      hasta: '2026-05-14',
    });

    expect(result.ok).toBe(true);
    expect(repo.cierreDeCaja).toHaveBeenCalledWith('bu-1', '2026-05-01', '2026-05-14');
  });

  it('retorna ErrorDeRangoFechas si desde > hasta', async () => {
    const repo = buildRepo();
    const uc = new ConsultarCierreDeCaja(repo);

    const result = await uc.execute({
      puntoDeVentaId: 'bu-1',
      desde: '2026-05-20',
      hasta: '2026-05-01',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ErrorDeRangoFechas);
    expect(result.error.code).toBe('REPORTING_RANGO_FECHAS_INVALIDO');
    expect(repo.cierreDeCaja).not.toHaveBeenCalled();
  });

  it('acepta rango de un solo dia (desde == hasta)', async () => {
    const repo = buildRepo();
    const uc = new ConsultarCierreDeCaja(repo);

    const result = await uc.execute({
      puntoDeVentaId: 'bu-1',
      desde: '2026-05-14',
      hasta: '2026-05-14',
    });

    expect(result.ok).toBe(true);
    expect(repo.cierreDeCaja).toHaveBeenCalledTimes(1);
  });

  it('propaga excepciones de infraestructura (no las envuelve en Result)', async () => {
    const repo = buildRepo({
      cierreDeCaja: vi.fn().mockRejectedValue(new Error('timeout')),
    });
    const uc = new ConsultarCierreDeCaja(repo);

    await expect(
      uc.execute({ puntoDeVentaId: 'bu-1', desde: '2026-05-01', hasta: '2026-05-14' }),
    ).rejects.toThrow('timeout');
  });
});
