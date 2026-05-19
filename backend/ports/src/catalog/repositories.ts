import type {
  Product,
  Category,
  Recipe,
  Combo,
  CategoryId,
  ProductId,
  RecipeId,
  ComboId,
  ProductVariantId,
  NombreDeCatalogo,
  FechaHora,
} from '@zahavi/domain-catalog';

/**
 * Puerto: Repositorio de Productos.
 * Responsabilidad: persistencia CRUD de aggregates Product.
 * El caso de uso es responsable de validar nombres únicos y categoría hoja.
 */
export interface IProductRepository {
  /**
   * Persistir un nuevo aggregate Product.
   */
  save(product: Product, correlacionId: string): Promise<void>;

  /**
   * Recuperar un Product por ID.
   */
  getById(productId: ProductId): Promise<Product | null>;

  /**
   * Recuperar todos los Products de una Categoria.
   * Devuelve array vacío si no hay.
   */
  getByCategoryId(categoryId: CategoryId): Promise<ReadonlyArray<Product>>;

  /**
   * Recuperar un Product por nombre normalizado dentro de una categoría.
   * Devuelve null si no existe (usado para validar unicidad en caso de uso).
   */
  getByNameInCategory(nombre: NombreDeCatalogo, categoryId: CategoryId): Promise<Product | null>;

  /**
   * Recuperar todos los Products en estado "activo".
   * Usado por Sales al listar menú.
   */
  getActive(): Promise<ReadonlyArray<Product>>;

  /**
   * Actualizar un Product existente.
   */
  update(product: Product, correlacionId: string): Promise<void>;

  /**
   * Listar todos los Products (admin).
   */
  list(): Promise<ReadonlyArray<Product>>;
}

/**
 * Puerto: Repositorio de Categorías.
 * Responsabilidad: CRUD y navegación de árbol jerárquico (≤3 niveles).
 */
export interface ICategoryRepository {
  /**
   * Persistir una nueva Categoria.
   */
  save(category: Category, correlacionId: string): Promise<void>;

  /**
   * Recuperar una Categoria por ID.
   */
  getById(categoryId: CategoryId): Promise<Category | null>;

  /**
   * Obtener todas las categorías raíz (padreId = null).
   * Devuelve array vacío si no hay.
   */
  getRoots(): Promise<ReadonlyArray<Category>>;

  /**
   * Obtener todas las subcategorías de un padre.
   * Devuelve array vacío si no hay.
   */
  getByParentId(parentId: CategoryId): Promise<ReadonlyArray<Category>>;

  /**
   * Obtener la profundidad de una categoría desde raíz.
   * Ej: raíz = 0, hijo de raíz = 1, nieto = 2.
   * Si categoryId no existe, devuelve -1.
   */
  getDepth(categoryId: CategoryId): Promise<number>;

  /**
   * Obtener el camino completo desde raíz hasta esta categoría.
   * Ej: [raíz, padre, hijo].
   * Si categoryId no existe, devuelve array vacío.
   */
  getAncestors(categoryId: CategoryId): Promise<ReadonlyArray<Category>>;

  /**
   * Verificar si existen productos ACTIVOS vinculados a esta categoría.
   * Devuelve true si hay al menos uno.
   */
  hasActiveProducts(categoryId: CategoryId): Promise<boolean>;

  /**
   * Actualizar una Categoria existente.
   */
  update(category: Category, correlacionId: string): Promise<void>;

  /**
   * Listar todas las categorías (respetando estado activa/archivada).
   */
  list(): Promise<ReadonlyArray<Category>>;
}

/**
 * Puerto: Repositorio de Recetas.
 * Responsabilidad: CRUD de aggregates Recipe.
 * Las recetas se identifican por varianteId (producto+variante).
 */
export interface IRecipeRepository {
  /**
   * Persistir una nueva Recipe.
   */
  save(recipe: Recipe, correlacionId: string): Promise<void>;

  /**
   * Recuperar una Recipe por su ID.
   */
  getById(recipeId: RecipeId): Promise<Recipe | null>;

  /**
   * Recuperar la Recipe asociada a una ProductVariant.
   * Devuelve null si la variante no tiene receta.
   */
  getByVariantId(varianteId: ProductVariantId): Promise<Recipe | null>;

  /**
   * Actualizar una Recipe existente (incrementa version).
   */
  update(recipe: Recipe, correlacionId: string): Promise<void>;

  /**
   * Listar todas las Recipes de un Producto.
   */
  getByProductId(productId: ProductId): Promise<ReadonlyArray<Recipe>>;
}

/**
 * Puerto: Repositorio de Combos.
 * Responsabilidad: CRUD de aggregates Combo.
 */
export interface IComboRepository {
  /**
   * Persistir un nuevo Combo.
   */
  save(combo: Combo, correlacionId: string): Promise<void>;

  /**
   * Recuperar un Combo por ID.
   */
  getById(comboId: ComboId): Promise<Combo | null>;

  /**
   * Recuperar todos los Combos en estado "activo" y vigentes en una fecha.
   * Usado por Sales al mostrar menú de promociones.
   */
  getActiveAndVigenteAt(ahora: FechaHora): Promise<ReadonlyArray<Combo>>;

  /**
   * Recuperar todos los Combos en estado "activo" (sin filtro de vigencia).
   */
  getActive(): Promise<ReadonlyArray<Combo>>;

  /**
   * Actualizar un Combo existente.
   */
  update(combo: Combo, correlacionId: string): Promise<void>;

  /**
   * Listar todos los Combos.
   */
  list(): Promise<ReadonlyArray<Combo>>;
}
