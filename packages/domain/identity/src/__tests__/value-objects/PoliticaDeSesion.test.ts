import { describe, it, expect } from 'vitest';
import { PoliticaDeSesion } from '../../value-objects/PoliticaDeSesion.js';
import { Duracion } from '../../value-objects/Duracion.js';

// ──────────────────────────────────────────────────────────────
// PoliticaDeSesion
// ──────────────────────────────────────────────────────────────

describe('PoliticaDeSesion', () => {
  // ── Políticas por rol ────────────────────────────────────────

  it('SUPERADMIN: topeAbsoluto de 4 horas, umbralCierre de 30 min', () => {
    const politica = PoliticaDeSesion.porRol('SUPERADMIN');
    expect(politica.topeAbsoluto.toMs()).toBe(4 * 3_600_000);
    expect(politica.umbralCierre.toMs()).toBe(30 * 60_000);
    expect(politica.limiteSimultaneo).toBe(3);
    expect(politica.requiereDispositivoAutorizado).toBe(false);
  });

  it('ADMIN: topeAbsoluto de 8 horas, umbralCierre de 1 hora', () => {
    const politica = PoliticaDeSesion.porRol('ADMIN');
    expect(politica.topeAbsoluto.toMs()).toBe(8 * 3_600_000);
    expect(politica.umbralCierre.toMs()).toBe(1 * 3_600_000);
    expect(politica.limiteSimultaneo).toBe(3);
    expect(politica.requiereDispositivoAutorizado).toBe(false);
  });

  it('WORKER: topeAbsoluto de 12 horas, umbralCierre de 30 min, limite 1 sesión', () => {
    const politica = PoliticaDeSesion.porRol('WORKER');
    expect(politica.topeAbsoluto.toMs()).toBe(12 * 3_600_000);
    expect(politica.umbralCierre.toMs()).toBe(30 * 60_000);
    expect(politica.limiteSimultaneo).toBe(1);
    expect(politica.requiereDispositivoAutorizado).toBe(true);
  });

  it('umbralBloqueo es de 5 minutos para todos los roles', () => {
    expect(PoliticaDeSesion.porRol('SUPERADMIN').umbralBloqueo.toMs()).toBe(5 * 60_000);
    expect(PoliticaDeSesion.porRol('ADMIN').umbralBloqueo.toMs()).toBe(5 * 60_000);
    expect(PoliticaDeSesion.porRol('WORKER').umbralBloqueo.toMs()).toBe(5 * 60_000);
  });

  // ── Factoría de() ────────────────────────────────────────────

  it('PoliticaDeSesion.de lanza si limiteSimultaneo < 1', () => {
    expect(() =>
      PoliticaDeSesion.de({
        umbralBloqueo: Duracion.deMinutos(5),
        umbralCierre: Duracion.deMinutos(10),
        topeAbsoluto: Duracion.deHoras(1),
        limiteSimultaneo: 0,
        requiereDispositivoAutorizado: false,
      }),
    ).toThrow();
  });

  it('PoliticaDeSesion.de acepta limiteSimultaneo = 1', () => {
    expect(() =>
      PoliticaDeSesion.de({
        umbralBloqueo: Duracion.deMinutos(5),
        umbralCierre: Duracion.deMinutos(10),
        topeAbsoluto: Duracion.deHoras(1),
        limiteSimultaneo: 1,
        requiereDispositivoAutorizado: true,
      }),
    ).not.toThrow();
  });
});

// ──────────────────────────────────────────────────────────────
// Duracion
// ──────────────────────────────────────────────────────────────

describe('Duracion', () => {
  it('deMinutos(5) equivale a 300_000 ms', () => {
    expect(Duracion.deMinutos(5).toMs()).toBe(300_000);
  });

  it('deHoras(1) equivale a 3_600_000 ms', () => {
    expect(Duracion.deHoras(1).toMs()).toBe(3_600_000);
  });

  it('deSegundos(30) equivale a 30_000 ms', () => {
    expect(Duracion.deSegundos(30).toMs()).toBe(30_000);
  });

  it('equals devuelve true para dos duraciones iguales', () => {
    const a = Duracion.deMinutos(10);
    const b = Duracion.deMinutos(10);
    expect(a.equals(b)).toBe(true);
  });

  it('esMayorQue devuelve true cuando la primera es mayor', () => {
    const a = Duracion.deHoras(1);
    const b = Duracion.deMinutos(30);
    expect(a.esMayorQue(b)).toBe(true);
  });

  it('esMayorQue devuelve false cuando la primera es menor', () => {
    const a = Duracion.deMinutos(30);
    const b = Duracion.deHoras(1);
    expect(a.esMayorQue(b)).toBe(false);
  });
});
