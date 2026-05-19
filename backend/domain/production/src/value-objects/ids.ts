import { type Result, ok, err } from '../errors/DomainError.js';
import { IdInvalidoError } from '../errors/index.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ──────────────────────────────────────────────────────────────
// IDs canónicos del BC Production
// ──────────────────────────────────────────────────────────────

/**
 * OrdenDeProduccion ID — identificador del aggregate raíz `OrdenDeProduccion`.
 */
export class OrdenDeProduccionId {
  private constructor(private readonly _value: string) {}

  static of(value: string): Result<OrdenDeProduccionId, IdInvalidoError> {
    if (!UUID_RE.test(value)) return err(new IdInvalidoError('OrdenDeProduccionId', value));
    return ok(new OrdenDeProduccionId(value));
  }

  static nuevo(): OrdenDeProduccionId {
    return new OrdenDeProduccionId(crypto.randomUUID());
  }

  toString(): string {
    return this._value;
  }

  equals(other: OrdenDeProduccionId): boolean {
    return this._value === other._value;
  }
}

/**
 * LineaDeBOM ID — identificador estable de una línea dentro del BOM de una orden.
 */
export class LineaDeBOMId {
  private constructor(private readonly _value: string) {}

  static of(value: string): Result<LineaDeBOMId, IdInvalidoError> {
    if (!UUID_RE.test(value)) return err(new IdInvalidoError('LineaDeBOMId', value));
    return ok(new LineaDeBOMId(value));
  }

  static nuevo(): LineaDeBOMId {
    return new LineaDeBOMId(crypto.randomUUID());
  }

  toString(): string {
    return this._value;
  }

  equals(other: LineaDeBOMId): boolean {
    return this._value === other._value;
  }
}

/**
 * RegistroDeMerma ID — identifica una entrada de merma en una OdP.
 */
export class RegistroDeMermaId {
  private constructor(private readonly _value: string) {}

  static of(value: string): Result<RegistroDeMermaId, IdInvalidoError> {
    if (!UUID_RE.test(value)) return err(new IdInvalidoError('RegistroDeMermaId', value));
    return ok(new RegistroDeMermaId(value));
  }

  static nuevo(): RegistroDeMermaId {
    return new RegistroDeMermaId(crypto.randomUUID());
  }

  toString(): string {
    return this._value;
  }

  equals(other: RegistroDeMermaId): boolean {
    return this._value === other._value;
  }
}

/**
 * Despacho ID — aggregate raíz `Despacho`.
 */
export class DespachoId {
  private constructor(private readonly _value: string) {}

  static of(value: string): Result<DespachoId, IdInvalidoError> {
    if (!UUID_RE.test(value)) return err(new IdInvalidoError('DespachoId', value));
    return ok(new DespachoId(value));
  }

  static nuevo(): DespachoId {
    return new DespachoId(crypto.randomUUID());
  }

  toString(): string {
    return this._value;
  }

  equals(other: DespachoId): boolean {
    return this._value === other._value;
  }
}

// ──────────────────────────────────────────────────────────────
// Referencias ACL a otros BC (opacas: solo UUID, sin importar aggregates ajenos)
// ──────────────────────────────────────────────────────────────

/**
 * Referencia opaca a `ProductVariant` (BC Catalog). Production NO importa
 * el aggregate Producto; solo guarda el identificador.
 */
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

/**
 * Referencia opaca a `Recipe` (BC Catalog).
 */
export class RecipeIdRef {
  private constructor(private readonly _value: string) {}

  static of(value: string): Result<RecipeIdRef, IdInvalidoError> {
    if (!UUID_RE.test(value)) return err(new IdInvalidoError('RecipeIdRef', value));
    return ok(new RecipeIdRef(value));
  }

  toString(): string {
    return this._value;
  }

  equals(other: RecipeIdRef): boolean {
    return this._value === other._value;
  }
}

/**
 * Referencia opaca a `Ingredient` (BC Inventory).
 */
export class IngredientIdRef {
  private constructor(private readonly _value: string) {}

  static of(value: string): Result<IngredientIdRef, IdInvalidoError> {
    if (!UUID_RE.test(value)) return err(new IdInvalidoError('IngredientIdRef', value));
    return ok(new IngredientIdRef(value));
  }

  toString(): string {
    return this._value;
  }

  equals(other: IngredientIdRef): boolean {
    return this._value === other._value;
  }
}

/**
 * Referencia opaca a `BusinessUnit` (compartido por todos los BC). Se usa
 * tanto para la planta central donde ocurre la producción como para el
 * punto de venta destino del despacho.
 */
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

/**
 * Referencia opaca a `Usuario` (BC Identity). Se usa para `iniciadaPor`,
 * `ejecutadaPor`, `canceladaPor`, etc.
 */
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
