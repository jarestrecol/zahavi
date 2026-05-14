import { ConsultarDashboard, ConsultarCierreDeCaja } from '@zahavi/application';
import type { ReportingAdapters } from '@zahavi/adapter-persistence-supabase';

export interface ReportingComposition {
  consultarDashboard: ConsultarDashboard;
  consultarCierreDeCaja: ConsultarCierreDeCaja;
}

export function createReportingComposition(adapters: ReportingAdapters): ReportingComposition {
  const { repositorioDeReportes } = adapters;
  return {
    consultarDashboard: new ConsultarDashboard(repositorioDeReportes),
    consultarCierreDeCaja: new ConsultarCierreDeCaja(repositorioDeReportes),
  };
}
