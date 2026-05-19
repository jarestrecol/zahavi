// ──────────────────────────────────────────────────────────────
// Public API del Bounded Context: Catalog
// ──────────────────────────────────────────────────────────────

// Errors & Result
export * from './errors/index.js';

// Value Objects
export * from './value-objects/enums.js';
export {
  ProductId,
  ProductVariantId,
  CategoryId,
  RecipeId,
  RecipeLineId,
  ComboId,
  ComboItemId,
  IngredientId,
} from './value-objects/ids.js';
export { Money } from './value-objects/Money.js';
export { Cantidad } from './value-objects/Cantidad.js';
export { NombreDeCatalogo } from './value-objects/NombreDeCatalogo.js';
export { Margen } from './value-objects/Margen.js';
export { FechaHora } from './value-objects/FechaHora.js';

// Entidades anidadas
export { ProductVariant, type ProductVariantProps } from './entities/ProductVariant.js';
export { RecipeLine, type RecipeLineProps } from './entities/RecipeLine.js';
export { ComboItem, type ComboItemProps } from './entities/ComboItem.js';

// Aggregate Roots
export { Product, type ProductProps } from './aggregates/Product.js';
export { Category, type CategoryProps } from './aggregates/Category.js';
export { Recipe, type RecipeProps } from './aggregates/Recipe.js';
export { Combo, type ComboProps } from './aggregates/Combo.js';

// Domain Events
export type * from './events/index.js';
