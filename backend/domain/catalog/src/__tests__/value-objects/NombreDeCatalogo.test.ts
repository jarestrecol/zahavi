import { describe, it, expect } from 'vitest';
import { NombreDeCatalogo } from '../../value-objects/NombreDeCatalogo.js';

describe('NombreDeCatalogo', () => {
  it('acepta nombres normales', () => {
    const r = NombreDeCatalogo.of('Cafe Mediano');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.toString()).toBe('Cafe Mediano');
  });

  it('preserva acentos y mayúsculas', () => {
    const r = NombreDeCatalogo.of('Café Mediano');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.toString()).toBe('Café Mediano');
  });

  it('colapsa espacios múltiples', () => {
    const r = NombreDeCatalogo.of('Pan   de   Yuca');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.toString()).toBe('Pan de Yuca');
  });

  it('recorta espacios al inicio y al final', () => {
    const r = NombreDeCatalogo.of('  Croissant  ');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.toString()).toBe('Croissant');
  });

  it('rechaza vacío', () => {
    expect(NombreDeCatalogo.of('').ok).toBe(false);
    expect(NombreDeCatalogo.of('   ').ok).toBe(false);
  });

  it('rechaza nombres demasiado cortos', () => {
    expect(NombreDeCatalogo.of('A').ok).toBe(false);
  });

  it('rechaza nombres demasiado largos', () => {
    expect(NombreDeCatalogo.of('A'.repeat(121)).ok).toBe(false);
  });

  it('rechaza caracteres de control', () => {
    expect(NombreDeCatalogo.of('Cafe\x00Latte').ok).toBe(false);
    expect(NombreDeCatalogo.of('Linea1\nLinea2').ok).toBe(false);
    expect(NombreDeCatalogo.of('Texto\x7Fcaracter').ok).toBe(false);
  });

  it('equals compara por valor normalizado', () => {
    const a = (NombreDeCatalogo.of('Pan  de  Yuca') as { ok: true; value: NombreDeCatalogo }).value;
    const b = (NombreDeCatalogo.of('Pan de Yuca') as { ok: true; value: NombreDeCatalogo }).value;
    expect(a.equals(b)).toBe(true);
  });
});
