const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class UsuarioId {
  private constructor(private readonly _value: string) {}

  static of(value: string): UsuarioId {
    if (!UUID_RE.test(value)) throw new Error(`UsuarioId inválido: "${value}"`);
    return new UsuarioId(value);
  }

  toString(): string {
    return this._value;
  }

  equals(other: UsuarioId): boolean {
    return this._value === other._value;
  }
}

export class SesionId {
  private constructor(private readonly _value: string) {}

  static of(value: string): SesionId {
    if (!UUID_RE.test(value)) throw new Error(`SesionId inválido: "${value}"`);
    return new SesionId(value);
  }

  toString(): string {
    return this._value;
  }

  equals(other: SesionId): boolean {
    return this._value === other._value;
  }
}

export class DispositivoId {
  private constructor(private readonly _value: string) {}

  static of(value: string): DispositivoId {
    if (!UUID_RE.test(value)) throw new Error(`DispositivoId inválido: "${value}"`);
    return new DispositivoId(value);
  }

  toString(): string {
    return this._value;
  }

  equals(other: DispositivoId): boolean {
    return this._value === other._value;
  }
}

export class UnidadDeNegocioId {
  private constructor(private readonly _value: string) {}

  static of(value: string): UnidadDeNegocioId {
    if (!UUID_RE.test(value)) throw new Error(`UnidadDeNegocioId inválido: "${value}"`);
    return new UnidadDeNegocioId(value);
  }

  toString(): string {
    return this._value;
  }

  equals(other: UnidadDeNegocioId): boolean {
    return this._value === other._value;
  }
}

// Id opaco del BC Sales — Identity lo transporta sin interpretarlo
export class MesaId {
  private constructor(private readonly _value: string) {}

  static of(value: string): MesaId {
    if (!value.trim()) throw new Error('MesaId no puede estar vacío');
    return new MesaId(value.trim());
  }

  toString(): string {
    return this._value;
  }

  equals(other: MesaId): boolean {
    return this._value === other._value;
  }
}
