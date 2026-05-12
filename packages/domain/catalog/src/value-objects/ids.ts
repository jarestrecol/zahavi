import { type Result, ok, err } from '../errors/DomainError.js';
import { IdInvalidoError } from '../errors/index.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ──────────────────────────────────────────────────────────────
// ProductId
// ──────────────────────────────────────────────────────────────

export class ProductId {
  private constructor(private readonly _value: string) {}

  static of(value: string): Result<ProductId, IdInvalidoError> {
    if (!UUID_RE.test(value)) return err(new IdInvalidoError('ProductId', value));
    return ok(new ProductId(value));
  }

  toString(): string {
    return this._value;
  }

  equals(other: ProductId): boolean {
    return this._value === other._value;
  }
}

// ──────────────────────────────────────────────────────────────
// ProductVariantId — único dentro del aggregate Producto
// ──────────────────────────────────────────────────────────────

export class ProductVariantId {
  private constructor(private readonly _value: string) {}

  static of(value: string): Result<ProductVariantId, IdInvalidoError> {
    if (!UUID_RE.test(value)) return err(new IdInvalidoError('ProductVariantId', value));
    return ok(new ProductVariantId(value));
  }

  toString(): string {
    return this._value;
  }

  equals(other: ProductVariantId): boolean {
    return this._value === other._value;
  }
}

// ──────────────────────────────────────────────────────────────
// CategoryId
// ──────────────────────────────────────────────────────────────

export class CategoryId {
  private constructor(private readonly _value: string) {}

  static of(value: string): Result<CategoryId, IdInvalidoError> {
    if (!UUID_RE.test(value)) return err(new IdInvalidoError('CategoryId', value));
    return ok(new CategoryId(value));
  }

  toString(): string {
    return this._value;
  }

  equals(other: CategoryId): boolean {
    return this._value === other._value;
  }
}

// ──────────────────────────────────────────────────────────────
// RecipeId
// ──────────────────────────────────────────────────────────────

export class RecipeId {
  private constructor(private readonly _value: string) {}

  static of(value: string): Result<RecipeId, IdInvalidoError> {
    if (!UUID_RE.test(value)) return err(new IdInvalidoError('RecipeId', value));
    return ok(new RecipeId(value));
  }

  toString(): string {
    return this._value;
  }

  equals(other: RecipeId): boolean {
    return this._value === other._value;
  }
}

// ──────────────────────────────────────────────────────────────
// RecipeLineId
// ──────────────────────────────────────────────────────────────

export class RecipeLineId {
  private constructor(private readonly _value: string) {}

  static of(value: string): Result<RecipeLineId, IdInvalidoError> {
    if (!UUID_RE.test(value)) return err(new IdInvalidoError('RecipeLineId', value));
    return ok(new RecipeLineId(value));
  }

  toString(): string {
    return this._value;
  }

  equals(other: RecipeLineId): boolean {
    return this._value === other._value;
  }
}

// ──────────────────────────────────────────────────────────────
// ComboId
// ──────────────────────────────────────────────────────────────

export class ComboId {
  private constructor(private readonly _value: string) {}

  static of(value: string): Result<ComboId, IdInvalidoError> {
    if (!UUID_RE.test(value)) return err(new IdInvalidoError('ComboId', value));
    return ok(new ComboId(value));
  }

  toString(): string {
    return this._value;
  }

  equals(other: ComboId): boolean {
    return this._value === other._value;
  }
}

// ──────────────────────────────────────────────────────────────
// ComboItemId
// ──────────────────────────────────────────────────────────────

export class ComboItemId {
  private constructor(private readonly _value: string) {}

  static of(value: string): Result<ComboItemId, IdInvalidoError> {
    if (!UUID_RE.test(value)) return err(new IdInvalidoError('ComboItemId', value));
    return ok(new ComboItemId(value));
  }

  toString(): string {
    return this._value;
  }

  equals(other: ComboItemId): boolean {
    return this._value === other._value;
  }
}

// ──────────────────────────────────────────────────────────────
// IngredientId — referencia opaca ACL al BC Inventory.
// Catalog NO importa el aggregate Ingrediente. Solo guarda el id.
// ──────────────────────────────────────────────────────────────

export class IngredientId {
  private constructor(private readonly _value: string) {}

  static of(value: string): Result<IngredientId, IdInvalidoError> {
    if (!UUID_RE.test(value)) return err(new IdInvalidoError('IngredientId', value));
    return ok(new IngredientId(value));
  }

  toString(): string {
    return this._value;
  }

  equals(other: IngredientId): boolean {
    return this._value === other._value;
  }
}
