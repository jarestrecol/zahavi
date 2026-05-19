const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Value Object que representa la identidad de un Usuario. Wrapper tipado sobre UUID v4. */
export class UsuarioId {
  private constructor(private readonly _value: string) {}

  /**
   * Construye un UsuarioId validado.
   * @throws {Error} Si `value` no es un UUID v4 válido.
   */
  static of(value: string): UsuarioId {
    if (!UUID_RE.test(value)) throw new Error(`UsuarioId inválido: "${value}"`);
    return new UsuarioId(value);
  }

  /** Devuelve el UUID como string. */
  toString(): string {
    return this._value;
  }

  /** Igualdad por valor. */
  equals(other: UsuarioId): boolean {
    return this._value === other._value;
  }
}

/** Value Object que representa la identidad de una Sesión activa. Wrapper tipado sobre UUID v4. */
export class SesionId {
  private constructor(private readonly _value: string) {}

  /**
   * Construye un SesionId validado.
   * @throws {Error} Si `value` no es un UUID v4 válido.
   */
  static of(value: string): SesionId {
    if (!UUID_RE.test(value)) throw new Error(`SesionId inválido: "${value}"`);
    return new SesionId(value);
  }

  /** Devuelve el UUID como string. */
  toString(): string {
    return this._value;
  }

  /** Igualdad por valor. */
  equals(other: SesionId): boolean {
    return this._value === other._value;
  }
}

/** Value Object que representa la identidad de un Dispositivo Autorizado (tablet POS). */
export class DispositivoId {
  private constructor(private readonly _value: string) {}

  /**
   * Construye un DispositivoId validado.
   * @throws {Error} Si `value` no es un UUID v4 válido.
   */
  static of(value: string): DispositivoId {
    if (!UUID_RE.test(value)) throw new Error(`DispositivoId inválido: "${value}"`);
    return new DispositivoId(value);
  }

  /** Devuelve el UUID como string. */
  toString(): string {
    return this._value;
  }

  /** Igualdad por valor. */
  equals(other: DispositivoId): boolean {
    return this._value === other._value;
  }
}

/** Value Object que representa la identidad de una Unidad de Negocio (punto de venta o planta). */
export class UnidadDeNegocioId {
  private constructor(private readonly _value: string) {}

  /**
   * Construye un UnidadDeNegocioId validado.
   * @throws {Error} Si `value` no es un UUID v4 válido.
   */
  static of(value: string): UnidadDeNegocioId {
    if (!UUID_RE.test(value)) throw new Error(`UnidadDeNegocioId inválido: "${value}"`);
    return new UnidadDeNegocioId(value);
  }

  /** Devuelve el UUID como string. */
  toString(): string {
    return this._value;
  }

  /** Igualdad por valor. */
  equals(other: UnidadDeNegocioId): boolean {
    return this._value === other._value;
  }
}

// Id opaco del BC Sales — Identity lo transporta sin interpretarlo
/** Value Object opaco para el ID de una Mesa del BC Sales; Identity no interpreta su contenido. */
export class MesaId {
  private constructor(private readonly _value: string) {}

  /**
   * Construye un MesaId no vacío.
   * @throws {Error} Si `value` está vacío o solo contiene espacios.
   */
  static of(value: string): MesaId {
    if (!value.trim()) throw new Error('MesaId no puede estar vacío');
    return new MesaId(value.trim());
  }

  /** Devuelve el ID como string. */
  toString(): string {
    return this._value;
  }

  /** Igualdad por valor. */
  equals(other: MesaId): boolean {
    return this._value === other._value;
  }
}
