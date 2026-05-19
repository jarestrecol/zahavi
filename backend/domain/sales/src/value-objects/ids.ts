import { type Result, ok, err } from '../errors/DomainError.js';
import { IdInvalidoError } from '../errors/index.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── IDs canónicos del BC Sales ───────────────────────────────────

export class MesaId {
  private constructor(private readonly _value: string) {}

  static of(value: string): Result<MesaId, IdInvalidoError> {
    if (!UUID_RE.test(value)) return err(new IdInvalidoError('MesaId', value));
    return ok(new MesaId(value));
  }

  static nuevo(): MesaId {
    return new MesaId(crypto.randomUUID());
  }

  toString(): string {
    return this._value;
  }

  equals(other: MesaId): boolean {
    return this._value === other._value;
  }
}

export class ComandaId {
  private constructor(private readonly _value: string) {}

  static of(value: string): Result<ComandaId, IdInvalidoError> {
    if (!UUID_RE.test(value)) return err(new IdInvalidoError('ComandaId', value));
    return ok(new ComandaId(value));
  }

  static nuevo(): ComandaId {
    return new ComandaId(crypto.randomUUID());
  }

  toString(): string {
    return this._value;
  }

  equals(other: ComandaId): boolean {
    return this._value === other._value;
  }
}

export class LineaDeComandaId {
  private constructor(private readonly _value: string) {}

  static of(value: string): Result<LineaDeComandaId, IdInvalidoError> {
    if (!UUID_RE.test(value)) return err(new IdInvalidoError('LineaDeComandaId', value));
    return ok(new LineaDeComandaId(value));
  }

  static nuevo(): LineaDeComandaId {
    return new LineaDeComandaId(crypto.randomUUID());
  }

  toString(): string {
    return this._value;
  }

  equals(other: LineaDeComandaId): boolean {
    return this._value === other._value;
  }
}

export class CobroId {
  private constructor(private readonly _value: string) {}

  static of(value: string): Result<CobroId, IdInvalidoError> {
    if (!UUID_RE.test(value)) return err(new IdInvalidoError('CobroId', value));
    return ok(new CobroId(value));
  }

  static nuevo(): CobroId {
    return new CobroId(crypto.randomUUID());
  }

  toString(): string {
    return this._value;
  }

  equals(other: CobroId): boolean {
    return this._value === other._value;
  }
}

export class FacturaId {
  private constructor(private readonly _value: string) {}

  static of(value: string): Result<FacturaId, IdInvalidoError> {
    if (!UUID_RE.test(value)) return err(new IdInvalidoError('FacturaId', value));
    return ok(new FacturaId(value));
  }

  static nuevo(): FacturaId {
    return new FacturaId(crypto.randomUUID());
  }

  toString(): string {
    return this._value;
  }

  equals(other: FacturaId): boolean {
    return this._value === other._value;
  }
}

// ── Referencias ACL a otros BC ───────────────────────────────────

/** Referencia opaca a `ProductVariant` (BC Catalog). */
export class ProductVariantIdRef {
  private constructor(private readonly _value: string) {}

  static of(value: string): Result<ProductVariantIdRef, IdInvalidoError> {
    if (!UUID_RE.test(value)) return err(new IdInvalidoError('ProductVariantIdRef', value));
    return ok(new ProductVariantIdRef(value));
  }

  toString(): string {
    return this._value;
  }

  equals(other: ProductVariantIdRef): boolean {
    return this._value === other._value;
  }
}

/** Referencia opaca a `BusinessUnit` (multi-tenant: punto de venta). */
export class BusinessUnitIdRef {
  private constructor(private readonly _value: string) {}

  static of(value: string): Result<BusinessUnitIdRef, IdInvalidoError> {
    if (!UUID_RE.test(value)) return err(new IdInvalidoError('BusinessUnitIdRef', value));
    return ok(new BusinessUnitIdRef(value));
  }

  toString(): string {
    return this._value;
  }

  equals(other: BusinessUnitIdRef): boolean {
    return this._value === other._value;
  }
}

/** Referencia opaca a `Usuario` (BC Identity). */
export class UsuarioIdRef {
  private constructor(private readonly _value: string) {}

  static of(value: string): Result<UsuarioIdRef, IdInvalidoError> {
    if (!UUID_RE.test(value)) return err(new IdInvalidoError('UsuarioIdRef', value));
    return ok(new UsuarioIdRef(value));
  }

  toString(): string {
    return this._value;
  }

  equals(other: UsuarioIdRef): boolean {
    return this._value === other._value;
  }
}
