import { describe, it, expect } from 'vitest';
import { Money } from '../../value-objects/Money.js';

describe('Money', () => {
  it('acepta enteros >= 0', () => {
    const r = Money.deCop(1500);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.toCop()).toBe(1500);
  });

  it('acepta cero', () => {
    const r = Money.deCop(0);
    expect(r.ok).toBe(true);
  });

  it('rechaza negativos', () => {
    const r = Money.deCop(-1);
    expect(r.ok).toBe(false);
  });

  it('rechaza decimales (COP no admite decimales)', () => {
    const r = Money.deCop(1500.5);
    expect(r.ok).toBe(false);
  });

  it('rechaza no finitos', () => {
    expect(Money.deCop(NaN).ok).toBe(false);
    expect(Money.deCop(Infinity).ok).toBe(false);
  });

  it('mas suma sin mutar', () => {
    const a = (Money.deCop(1000) as { ok: true; value: Money }).value;
    const b = (Money.deCop(500) as { ok: true; value: Money }).value;
    const c = a.mas(b);
    expect(c.toCop()).toBe(1500);
    expect(a.toCop()).toBe(1000); // a no mutó
  });

  it('menos rechaza resultado negativo', () => {
    const a = (Money.deCop(500) as { ok: true; value: Money }).value;
    const b = (Money.deCop(1000) as { ok: true; value: Money }).value;
    const r = a.menos(b);
    expect(r.ok).toBe(false);
  });

  it('multiplicarPor redondea con Math.round', () => {
    const a = (Money.deCop(8450) as { ok: true; value: Money }).value;
    // 8450 * 0.350 = 2957.5 → Math.round → 2958
    const r = a.multiplicarPor(0.35);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.toCop()).toBe(2958);
  });

  it('multiplicarPor rechaza factor negativo', () => {
    const a = (Money.deCop(1000) as { ok: true; value: Money }).value;
    expect(a.multiplicarPor(-1).ok).toBe(false);
  });

  it('equals compara por valor', () => {
    const a = (Money.deCop(1000) as { ok: true; value: Money }).value;
    const b = (Money.deCop(1000) as { ok: true; value: Money }).value;
    expect(a.equals(b)).toBe(true);
  });
});
