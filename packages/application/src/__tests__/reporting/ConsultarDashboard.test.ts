import { describe, it, expect, vi } from 'vitest';
import { ConsultarDashboard } from '../../reporting/ConsultarDashboard.js';
import type { IReportingRepository, DashboardDelDia } from '@zahavi/ports';

function buildRepo(overrides: Partial<IReportingRepository> = {}): IReportingRepository {
  return {
    dashboardDelDia: vi.fn().mockResolvedValue(dashboardVacio()),
    cierreDeCaja: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

function dashboardVacio(): DashboardDelDia {
  return {
    fecha: '2026-05-14',
    totalVentas: 0,
    numeroCobros: 0,
    ticketPromedio: 0,
    porMetodo: [],
    porHora: [],
    facturasEmitidas: 0,
  };
}

describe('ConsultarDashboard', () => {
  it('retorna ok con el dashboard cuando el repo responde correctamente', async () => {
    const repo = buildRepo();
    const uc = new ConsultarDashboard(repo);

    const result = await uc.execute({ puntoDeVentaId: 'bu-1', fecha: '2026-05-14' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.fecha).toBe('2026-05-14');
    expect(repo.dashboardDelDia).toHaveBeenCalledWith('bu-1', '2026-05-14');
  });

  it('usa la fecha de hoy si no se pasa fecha', async () => {
    const repo = buildRepo();
    const uc = new ConsultarDashboard(repo);

    const result = await uc.execute({ puntoDeVentaId: 'bu-1' });

    expect(result.ok).toBe(true);
    expect(repo.dashboardDelDia).toHaveBeenCalledWith(
      'bu-1',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    );
  });

  it('propaga excepciones de infraestructura (no las envuelve en Result)', async () => {
    const repo = buildRepo({
      dashboardDelDia: vi.fn().mockRejectedValue(new Error('BD no disponible')),
    });
    const uc = new ConsultarDashboard(repo);

    await expect(uc.execute({ puntoDeVentaId: 'bu-1', fecha: '2026-05-14' })).rejects.toThrow(
      'BD no disponible',
    );
  });

  it('retorna totalVentas y ticketPromedio del repo sin modificarlos', async () => {
    const repo = buildRepo({
      dashboardDelDia: vi.fn().mockResolvedValue({
        ...dashboardVacio(),
        totalVentas: 60_000,
        numeroCobros: 3,
        ticketPromedio: 20_000,
      }),
    });
    const uc = new ConsultarDashboard(repo);

    const result = await uc.execute({ puntoDeVentaId: 'bu-1', fecha: '2026-05-14' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.ticketPromedio).toBe(20_000);
  });
});
