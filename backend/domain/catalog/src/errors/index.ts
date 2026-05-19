export { DomainError, ok, err } from './DomainError.js';
export type { Result } from './DomainError.js';
export { MoneyInvalidoError } from '@zahavi/domain-shared-kernel';

import { DomainError } from './DomainError.js';

// ──────────────────────────────────────────────────────────────
// Errores de Value Objects
// ──────────────────────────────────────────────────────────────

export class NombreDeCatalogoInvalidoError extends DomainError {
  readonly code = 'CATALOG_NOMBRE_INVALIDO';
  constructor(raw: string) {
    super(`Nombre de catálogo inválido: "${raw}"`);
  }
}

export class CantidadInvalidaError extends DomainError {
  readonly code = 'CATALOG_CANTIDAD_INVALIDA';
  constructor(razon: string) {
    super(`Cantidad inválida: ${razon}`);
  }
}

export class IdInvalidoError extends DomainError {
  readonly code = 'CATALOG_ID_INVALIDO';
  constructor(tipo: string, raw: string) {
    super(`${tipo} inválido: "${raw}"`);
  }
}

export class OrdenInvalidoError extends DomainError {
  readonly code = 'CATALOG_ORDEN_INVALIDO';
  constructor(valor: number) {
    super(`Orden inválido: ${valor}. Debe ser entero >= 0.`);
  }
}

// ──────────────────────────────────────────────────────────────
// Errores de Producto
// ──────────────────────────────────────────────────────────────

export class ProductoSinVariantesError extends DomainError {
  readonly code = 'CATALOG_PRODUCTO_SIN_VARIANTES';
  constructor(productoId: string) {
    super(`El producto "${productoId}" debe tener al menos una variante.`);
  }
}

export class VarianteDuplicadaError extends DomainError {
  readonly code = 'CATALOG_VARIANTE_DUPLICADA';
  constructor(varianteId: string) {
    super(`Ya existe una variante con id "${varianteId}" en el producto.`);
  }
}

export class VarianteNoEncontradaError extends DomainError {
  readonly code = 'CATALOG_VARIANTE_NO_ENCONTRADA';
  constructor(varianteId: string) {
    super(`Variante "${varianteId}" no encontrada en el producto.`);
  }
}

export class PrecioInvalidoError extends DomainError {
  readonly code = 'CATALOG_PRECIO_INVALIDO';
  constructor(razon: string) {
    super(`Precio inválido: ${razon}`);
  }
}

export class ProductoSinRecetaError extends DomainError {
  readonly code = 'CATALOG_PRODUCTO_SIN_RECETA';
  constructor(productoId: string) {
    super(`El producto "${productoId}" no tiene receta vinculada y no puede activarse.`);
  }
}

export class ProductoYaEnEstadoError extends DomainError {
  readonly code = 'CATALOG_PRODUCTO_YA_EN_ESTADO';
  constructor(productoId: string, estado: string) {
    super(`El producto "${productoId}" ya está en estado "${estado}".`);
  }
}

export class RecetaNoCorrespondeAVarianteError extends DomainError {
  readonly code = 'CATALOG_RECETA_NO_CORRESPONDE';
  constructor(varianteId: string, recetaId: string) {
    super(`La receta "${recetaId}" no corresponde a la variante "${varianteId}".`);
  }
}

// ──────────────────────────────────────────────────────────────
// Errores de Categoria
// ──────────────────────────────────────────────────────────────

export class RolNoAutorizadoCatalogError extends DomainError {
  readonly code = 'CATALOG_ROL_NO_AUTORIZADO';
  constructor(rol: string, operacion: string) {
    super(`El rol "${rol}" no tiene permiso para realizar la operación "${operacion}".`);
  }
}

export class CategoriaNoHojaError extends DomainError {
  readonly code = 'CATALOG_CATEGORIA_NO_HOJA';
  constructor(categoriaId: string) {
    super(
      `La categoría "${categoriaId}" tiene subcategorías y no puede usarse directamente para productos.`,
    );
  }
}

export class RecetaYaExisteError extends DomainError {
  readonly code = 'CATALOG_RECETA_YA_EXISTE';
  constructor(varianteId: string) {
    super(`La variante "${varianteId}" ya tiene una receta vinculada.`);
  }
}

export class AutoReferenciaDeCategoriaError extends DomainError {
  readonly code = 'CATALOG_CATEGORIA_AUTO_REF';
  constructor(categoriaId: string) {
    super(`La categoría "${categoriaId}" no puede ser su propio padre.`);
  }
}

export class CategoriaConProductosActivosError extends DomainError {
  readonly code = 'CATALOG_CATEGORIA_CON_PRODUCTOS';
  constructor(categoriaId: string) {
    super(
      `La categoría "${categoriaId}" tiene productos activos y no puede archivarse ni eliminarse.`,
    );
  }
}

export class CategoriaYaEnEstadoError extends DomainError {
  readonly code = 'CATALOG_CATEGORIA_YA_EN_ESTADO';
  constructor(categoriaId: string, estado: string) {
    super(`La categoría "${categoriaId}" ya está en estado "${estado}".`);
  }
}

// ──────────────────────────────────────────────────────────────
// Errores de Receta
// ──────────────────────────────────────────────────────────────

export class RecetaSinLineasError extends DomainError {
  readonly code = 'CATALOG_RECETA_SIN_LINEAS';
  constructor(recetaId: string) {
    super(`La receta "${recetaId}" debe tener al menos una línea.`);
  }
}

export class LineaDeRecetaDuplicadaError extends DomainError {
  readonly code = 'CATALOG_LINEA_RECETA_DUPLICADA';
  constructor(lineaId: string) {
    super(`Ya existe una línea con id "${lineaId}" en la receta.`);
  }
}

export class LineaDeRecetaNoEncontradaError extends DomainError {
  readonly code = 'CATALOG_LINEA_RECETA_NO_ENCONTRADA';
  constructor(lineaId: string) {
    super(`Línea "${lineaId}" no encontrada en la receta.`);
  }
}

export class IngredienteDuplicadoEnRecetaError extends DomainError {
  readonly code = 'CATALOG_INGREDIENTE_DUPLICADO';
  constructor(ingredientId: string) {
    super(`El ingrediente "${ingredientId}" aparece más de una vez en la receta.`);
  }
}

export class CostoIngredienteNoDisponibleError extends DomainError {
  readonly code = 'CATALOG_COSTO_INGREDIENTE_NO_DISPONIBLE';
  constructor(ingredientIds: ReadonlyArray<string>) {
    super(
      `Faltan costos para los ingredientes: ${ingredientIds.join(', ')}. ` +
        `No se puede calcular el escandallo.`,
    );
  }
}

export class CostoCeroSospechosoError extends DomainError {
  readonly code = 'CATALOG_COSTO_CERO_SOSPECHOSO';
  constructor(recetaId: string) {
    super(
      `La receta "${recetaId}" arroja costo total $ 0. ` +
        `Verifique que los costos de los ingredientes estén actualizados.`,
    );
  }
}

// ──────────────────────────────────────────────────────────────
// Errores de Combo
// ──────────────────────────────────────────────────────────────

export class ComboSinItemsError extends DomainError {
  readonly code = 'CATALOG_COMBO_SIN_ITEMS';
  constructor(comboId: string) {
    super(`El combo "${comboId}" debe tener al menos un item.`);
  }
}

export class ItemDeComboDuplicadoError extends DomainError {
  readonly code = 'CATALOG_ITEM_COMBO_DUPLICADO';
  constructor(itemId: string) {
    super(`Ya existe un item con id "${itemId}" en el combo.`);
  }
}

export class ItemDeComboNoEncontradoError extends DomainError {
  readonly code = 'CATALOG_ITEM_COMBO_NO_ENCONTRADO';
  constructor(itemId: string) {
    super(`Item "${itemId}" no encontrado en el combo.`);
  }
}

export class VarianteDuplicadaEnComboError extends DomainError {
  readonly code = 'CATALOG_VARIANTE_DUPLICADA_EN_COMBO';
  constructor(varianteId: string) {
    super(`La variante "${varianteId}" ya está incluida en otro item del combo.`);
  }
}

export class ComboYaEnEstadoError extends DomainError {
  readonly code = 'CATALOG_COMBO_YA_EN_ESTADO';
  constructor(comboId: string, estado: string) {
    super(`El combo "${comboId}" ya está en estado "${estado}".`);
  }
}

export class VigenciaInvalidaError extends DomainError {
  readonly code = 'CATALOG_VIGENCIA_INVALIDA';
  constructor(comboId: string) {
    super(
      `El combo "${comboId}" tiene una vigencia inválida: vigenciaDesde debe ser <= vigenciaHasta.`,
    );
  }
}

// ──────────────────────────────────────────────────────────────
// Errores de búsqueda
// ──────────────────────────────────────────────────────────────

export class ProductoNoEncontradoError extends DomainError {
  readonly code = 'CATALOG_PRODUCTO_NO_ENCONTRADO';
  constructor(ref: string) {
    super(`Producto no encontrado: "${ref}"`);
  }
}

export class CategoriaNoEncontradaError extends DomainError {
  readonly code = 'CATALOG_CATEGORIA_NO_ENCONTRADA';
  constructor(ref: string) {
    super(`Categoría no encontrada: "${ref}"`);
  }
}

export class RecetaNoEncontradaError extends DomainError {
  readonly code = 'CATALOG_RECETA_NO_ENCONTRADA';
  constructor(ref: string) {
    super(`Receta no encontrada: "${ref}"`);
  }
}

export class ComboNoEncontradoError extends DomainError {
  readonly code = 'CATALOG_COMBO_NO_ENCONTRADO';
  constructor(ref: string) {
    super(`Combo no encontrado: "${ref}"`);
  }
}
