import { describe, it, expect } from 'vitest';
import { Email } from '../../value-objects/Email.js';
import { EmailInvalidoError } from '../../errors/index.js';

// ──────────────────────────────────────────────────────────────
// Email
// ──────────────────────────────────────────────────────────────

describe('Email', () => {
  // ── Happy paths ─────────────────────────────────────────────

  it('acepta un email bien formado y lo normaliza a minúsculas', () => {
    const result = Email.of('Juan@Panaderia.com');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.toString()).toBe('juan@panaderia.com');
    }
  });

  it('elimina espacios en los extremos antes de validar', () => {
    const result = Email.of('  operario@zahavi.co  ');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.toString()).toBe('operario@zahavi.co');
    }
  });

  it('acepta subdominio en el dominio', () => {
    const result = Email.of('admin@mail.zahavi.com.co');
    expect(result.ok).toBe(true);
  });

  it('dos instancias con el mismo valor son iguales', () => {
    const a = Email.of('test@zahavi.co');
    const b = Email.of('TEST@zahavi.co');
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.value.equals(b.value)).toBe(true);
    }
  });

  // ── Errores de dominio ───────────────────────────────────────

  it('rechaza string sin @', () => {
    const result = Email.of('sinArroba.com');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(EmailInvalidoError);
    }
  });

  it('rechaza string vacío', () => {
    const result = Email.of('');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(EmailInvalidoError);
    }
  });

  it('rechaza email con espacio interno', () => {
    // El espacio interno no se elimina con trim(), la regex lo rechaza
    const result = Email.of('usuario nombre@zahavi.co');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(EmailInvalidoError);
    }
  });

  it('rechaza email de más de 254 caracteres', () => {
    const long = `${'a'.repeat(245)}@zahavi.co`; // 245 + 10 = 255
    expect(long.trim().toLowerCase().length).toBeGreaterThan(254);
    const result = Email.of(long);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(EmailInvalidoError);
    }
  });

  it('rechaza email sin parte de dominio después del @', () => {
    const result = Email.of('usuario@');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(EmailInvalidoError);
    }
  });

  it('rechaza email sin punto en el dominio', () => {
    const result = Email.of('usuario@dominio');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(EmailInvalidoError);
    }
  });

  it('el código de error es IDENTITY_EMAIL_INVALIDO', () => {
    const result = Email.of('noesunemail');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('IDENTITY_EMAIL_INVALIDO');
    }
  });
});
