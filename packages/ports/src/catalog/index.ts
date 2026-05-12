// ──────────────────────────────────────────────────────────────
// Public API de Puertos: Bounded Context Catalog
// ──────────────────────────────────────────────────────────────

export type {
  IProductRepository,
  ICategoryRepository,
  IRecipeRepository,
  IComboRepository,
} from './repositories.js';

export type { IPublicadorDeDomainEventsCatalog, CatalogDomainEvent } from './publishers.js';

export type { IConsultorDeCostosDeIngredientes } from './consultores.js';
