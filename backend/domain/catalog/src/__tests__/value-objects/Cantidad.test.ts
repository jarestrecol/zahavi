import { describe, it, expect } from 'vitest';
import { Cantidad } from '../../value-objects/Cantidad.js';

describe('Cantidad', () => {
  it('acepta valores positivos con unidad válida', () => {
    const r = Cantidad.de(0.35, 'kilogramo');
    expect(r.ok).toBe(true);
  });

  it('rechaza cero', () => {
    expect(Cantidad.de(0, 'gramo').ok).toBe(false);
  });

  it('rechaza negativos', () => {
    expect(Cantidad.de(-1, 'gramo').ok).toBe(false);
  });

  it('rechaza no finitos', () => {
    expect(Cantidad.de(NaN, 'gramo').ok).toBe(false);
    expect(Cantidad.de(Infinity, 'gramo').ok).toBe(false);
  });

  it('mas falla con unidades distintas', () => {
    const a = (Cantidad.de(100, 'gramo') as { ok: true; value: Cantidad }).value;
    const b = (Cantidad.de(1, 'kilogramo') as { ok: true; value: Cantidad }).value;
    expect(a.mas(b).ok).toBe(false);
  });

  it('mas suma con misma unidad', () => {
    const a = (Cantidad.de(100, 'gramo') as { ok: true; value: Cantidad }).value;
    const b = (Cantidad.de(50, 'gramo') as { ok: true; value: Cantidad }).value;
    const r = a.mas(b);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.valor()).toBe(150);
  });
});
