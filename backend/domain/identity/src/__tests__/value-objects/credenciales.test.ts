import { describe, it, expect } from 'vitest';
import {
  Pin,
  ContrasenaEnClaro,
  HashDeContrasena,
  HashDePin,
} from '../../value-objects/credenciales.js';
import { PinInvalidoError, ContrasenaDebilError } from '../../errors/index.js';

// ──────────────────────────────────────────────────────────────
// Pin
// ──────────────────────────────────────────────────────────────

describe('Pin', () => {
  it('acepta exactamente 6 dígitos numéricos', () => {
    const result = Pin.of('123456');
    expect(result.ok).toBe(true);
  });

  it('acepta "000000" (todo ceros es válido)', () => {
    const result = Pin.of('000000');
    expect(result.ok).toBe(true);
  });

  it('rechaza PIN de 5 dígitos', () => {
    const result = Pin.of('12345');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(PinInvalidoError);
    }
  });

  it('rechaza PIN de 7 dígitos', () => {
    const result = Pin.of('1234567');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(PinInvalidoError);
    }
  });

  it('rechaza PIN con letras', () => {
    const result = Pin.of('12345a');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(PinInvalidoError);
    }
  });

  it('rechaza PIN vacío', () => {
    const result = Pin.of('');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(PinInvalidoError);
    }
  });

  it('toString() retorna texto redactado, nunca el valor real', () => {
    const result = Pin.of('999888');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.toString()).not.toContain('999888');
      expect(result.value.toString()).toBe('[PIN REDACTADO]');
    }
  });

  it('_unsafeRead() devuelve el valor original', () => {
    const result = Pin.of('123456');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value._unsafeRead()).toBe('123456');
    }
  });

  it('el código de error es IDENTITY_PIN_INVALIDO', () => {
    const result = Pin.of('abcdef');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('IDENTITY_PIN_INVALIDO');
    }
  });
});

// ──────────────────────────────────────────────────────────────
// ContrasenaEnClaro
// ──────────────────────────────────────────────────────────────

describe('ContrasenaEnClaro', () => {
  // Mínimo: 1 mayúscula, 1 minúscula, 1 dígito, 1 símbolo, longitud >= 12
  const CONTRASENA_VALIDA = 'Abc123!@#defgh';

  it('acepta contraseña que cumple todos los criterios de complejidad', () => {
    const result = ContrasenaEnClaro.of(CONTRASENA_VALIDA);
    expect(result.ok).toBe(true);
  });

  it('toString() retorna texto redactado, nunca el valor real', () => {
    const result = ContrasenaEnClaro.of(CONTRASENA_VALIDA);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.toString()).not.toContain(CONTRASENA_VALIDA);
      expect(result.value.toString()).toBe('[CONTRASEÑA REDACTADA]');
    }
  });

  it('rechaza contraseña con menos de 12 caracteres aunque tenga complejidad', () => {
    // 11 chars: Aa1!aaaaaaa
    const result = ContrasenaEnClaro.of('Aa1!aaaaaaa');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ContrasenaDebilError);
    }
  });

  it('rechaza contraseña sin símbolo especial', () => {
    const result = ContrasenaEnClaro.of('Abcdefgh1234');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ContrasenaDebilError);
    }
  });

  it('rechaza contraseña sin dígito', () => {
    const result = ContrasenaEnClaro.of('Abcdefgh!@#$');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ContrasenaDebilError);
    }
  });

  it('rechaza contraseña sin mayúscula', () => {
    const result = ContrasenaEnClaro.of('abcdefgh1!@#');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ContrasenaDebilError);
    }
  });

  it('rechaza contraseña sin minúscula', () => {
    const result = ContrasenaEnClaro.of('ABCDEFGH1!@#');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ContrasenaDebilError);
    }
  });

  it('rechaza cadena vacía', () => {
    const result = ContrasenaEnClaro.of('');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ContrasenaDebilError);
    }
  });

  it('el código de error es IDENTITY_CONTRASENA_DEBIL', () => {
    const result = ContrasenaEnClaro.of('corta');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('IDENTITY_CONTRASENA_DEBIL');
    }
  });
});

// ──────────────────────────────────────────────────────────────
// HashDeContrasena
// ──────────────────────────────────────────────────────────────

describe('HashDeContrasena', () => {
  it('acepta hash con prefijo $argon2id$', () => {
    const hash = HashDeContrasena.deCadenaYaHasheada(
      '$argon2id$v=19$m=65536,t=3,p=4$salt$hashvalue',
    );
    expect(hash.toString()).toContain('$argon2id$');
  });

  it('acepta hash con prefijo $2b$ (bcrypt)', () => {
    const hash = HashDeContrasena.deCadenaYaHasheada('$2b$12$saltsaltsaltsaltsa.hashvalue');
    expect(hash.toString()).toContain('$2b$');
  });

  it('acepta hash con prefijo $2a$ (bcrypt legacy)', () => {
    const hash = HashDeContrasena.deCadenaYaHasheada('$2a$10$saltsaltsaltsaltsa.hashvalue');
    expect(hash.toString()).toContain('$2a$');
  });

  it('rechaza cadena sin prefijo de algoritmo reconocido', () => {
    expect(() => HashDeContrasena.deCadenaYaHasheada('sinPrefijo123')).toThrow();
  });

  it('rechaza cadena vacía', () => {
    expect(() => HashDeContrasena.deCadenaYaHasheada('')).toThrow();
  });

  it('rechaza cadena con espacios en blanco solamente', () => {
    expect(() => HashDeContrasena.deCadenaYaHasheada('   ')).toThrow();
  });

  it('dos hashes iguales son equals', () => {
    const raw = '$argon2id$v=19$m=65536,t=3,p=4$salt$hashvalue';
    const a = HashDeContrasena.deCadenaYaHasheada(raw);
    const b = HashDeContrasena.deCadenaYaHasheada(raw);
    expect(a.equals(b)).toBe(true);
  });

  it('dos hashes distintos no son equals', () => {
    const a = HashDeContrasena.deCadenaYaHasheada('$argon2id$v=19$hash1');
    const b = HashDeContrasena.deCadenaYaHasheada('$argon2id$v=19$hash2');
    expect(a.equals(b)).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────
// HashDePin
// ──────────────────────────────────────────────────────────────

describe('HashDePin', () => {
  it('acepta cualquier cadena no vacía (el dominio no valida el formato del hash de PIN)', () => {
    const hash = HashDePin.deCadenaYaHasheada('$argon2id$v=19$hashpin');
    expect(hash.toString()).toBe('$argon2id$v=19$hashpin');
  });

  it('rechaza cadena vacía', () => {
    expect(() => HashDePin.deCadenaYaHasheada('')).toThrow();
  });

  it('rechaza cadena solo con espacios', () => {
    expect(() => HashDePin.deCadenaYaHasheada('   ')).toThrow();
  });

  it('dos hashes iguales son equals', () => {
    const a = HashDePin.deCadenaYaHasheada('hash-pin-1');
    const b = HashDePin.deCadenaYaHasheada('hash-pin-1');
    expect(a.equals(b)).toBe(true);
  });
});
