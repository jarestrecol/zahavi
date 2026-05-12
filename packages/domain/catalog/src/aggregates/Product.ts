import { type Result, ok, err } from '../errors/DomainError.js';
import {
  ProductoSinVariantesError,
  VarianteDuplicadaError,
  VarianteNoEncontradaError,
  PrecioInvalidoError,
  ProductoYaEnEstadoError,
  RecetaNoCorrespondeAVarianteError,
  CostoIngredienteNoDisponibleError,
  CostoCeroSospechosoError,
  MoneyInvalidoError,
} from '../errors/index.js';
import {
  ProductId,
  ProductVariantId,
  CategoryId,
} from '../value-objects/ids.js';
import { NombreDeCatalogo } from '../value-objects/NombreDeCatalogo.js';
import { Money } from '../value-objects/Money.js';
import { Margen } from '../value-objects/Margen.js';
import { FechaHora } from '../value-objects/FechaHora.js';
import type { EstadoDeProducto } from '../value-objects/enums.js';
import { ProductVariant } from '../entities/ProductVariant.js';
import type { Recipe } from './Recipe.js';
import type {
  CatalogDomainEvent,
  ProductoCreadoEvent,
  ProductoActivadoEvent,
  ProductoDesactivadoEvent,
  VarianteAgregadaAProductoEvent,
  VarianteEliminadaDeProductoEvent,
  PrecioDeVarianteCambiadoEvent,
  RecetaVinculadaAVarianteEvent,
  ImagenDeProductoCambiadaEvent,
  NombreDeProductoCambiadoEvent,
  CategoriaDeProductoCambiadaEvent,
} from '../events/index.js';

export interface ProductProps {
  readonly id: ProductId;
  readonly nombre: NombreDeCatalogo;
  readonly categoriaId: CategoryId;
  readonly imagenUrl: string | null;
  readonly variantes: ReadonlyArray<ProductVariant>;
  readonly estado: EstadoDeProducto;
  readonly creadoEn: FechaHora;
}

/**
 * Aggregate root `Producto`.
 *
 * Invariantes (cf. docs/domain-model/catalog/aggregates.md):
 *   1. variantes.length >= 1
 *   2. precio de cada variante > 0 (delegado a `ProductVariant`)
 *   3. ids de variantes únicos en el aggregate
 *   4. categoriaId apunta a una hoja (validado en caso de uso)
 *   5. nombre único en su categoría (validado en caso de uso)
 *
 * Cada `ProductVariant` porta su propio `recetaId` (1 receta por variante).
 * `recetaId = null` en una variante indica "variante de reventa": su costo
 * proviene del último precio de compra en Inventory. La bifurcación de
 * escandallo ocurre en el caso de uso.
 *
 * El cálculo de margen es una **consulta pura**: no muta el aggregate ni
 * emite eventos. Solo se debe invocar tras autorización por rol
 * (ADMIN/SUPERADMIN); la verificación es responsabilidad de la capa de
 * aplicación.
 */
export class Product {
  readonly id: ProductId;
  readonly nombre: NombreDeCatalogo;
  readonly categoriaId: CategoryId;
  readonly imagenUrl: string | null;
  readonly variantes: ReadonlyArray<ProductVariant>;
  readonly estado: EstadoDeProducto;
  readonly creadoEn: FechaHora;

  private readonly _events: CatalogDomainEvent[];

  private constructor(props: ProductProps, events: CatalogDomainEvent[] = []) {
    this.id = props.id;
    this.nombre = props.nombre;
    this.categoriaId = props.categoriaId;
    this.imagenUrl = props.imagenUrl;
    this.variantes = props.variantes;
    this.estado = props.estado;
    this.creadoEn = props.creadoEn;
    this._events = events;
  }

  // ── Factoría ────────────────────────────────────────────────

  static crear(
    props: {
      id: ProductId;
      nombre: NombreDeCatalogo;
      categoriaId: CategoryId;
      imagenUrl: string | null;
      varianteInicial: ProductVariant;
      ahora: FechaHora;
    },
    eventoId: string,
  ): Result<Product, never> {
    const producto = new Product(
      {
        id: props.id,
        nombre: props.nombre,
        categoriaId: props.categoriaId,
        imagenUrl: props.imagenUrl,
        variantes: [props.varianteInicial],
        estado: 'borrador',
        creadoEn: props.ahora,
      },
      [],
    );

    const evento: ProductoCreadoEvent = {
      eventoId,
      tipo: 'ProductoCreado',
      aggregateId: props.id.toString(),
      ocurridoEn: props.ahora.toTimestamp(),
      version: 1,
      payload: {
        productoId: props.id.toString(),
        nombre: props.nombre.toString(),
        categoriaId: props.categoriaId.toString(),
        varianteInicialId: props.varianteInicial.id.toString(),
        precioVarianteInicialCop: props.varianteInicial.precio.toCop(),
        estado: 'borrador',
      },
    };
    producto._events.push(evento);
    return ok(producto);
  }

  // ── Comandos ────────────────────────────────────────────────

  agregarVariante(
    variante: ProductVariant,
    ahora: FechaHora,
    eventoId: string,
  ): Result<Product, VarianteDuplicadaError> {
    if (this.variantes.some((v) => v.id.equals(variante.id)))
      return err(new VarianteDuplicadaError(variante.id.toString()));

    const nuevo = this._con({ variantes: [...this.variantes, variante] });
    const evento: VarianteAgregadaAProductoEvent = {
      eventoId,
      tipo: 'VarianteAgregadaAProducto',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        productoId: this.id.toString(),
        varianteId: variante.id.toString(),
        nombre: variante.nombre.toString(),
        precioCop: variante.precio.toCop(),
      },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  eliminarVariante(
    varianteId: ProductVariantId,
    ahora: FechaHora,
    eventoId: string,
  ): Result<Product, VarianteNoEncontradaError | ProductoSinVariantesError> {
    if (!this.variantes.some((v) => v.id.equals(varianteId)))
      return err(new VarianteNoEncontradaError(varianteId.toString()));

    const nuevasVariantes = this.variantes.filter((v) => !v.id.equals(varianteId));
    if (nuevasVariantes.length === 0)
      return err(new ProductoSinVariantesError(this.id.toString()));

    const nuevo = this._con({ variantes: nuevasVariantes });
    const evento: VarianteEliminadaDeProductoEvent = {
      eventoId,
      tipo: 'VarianteEliminadaDeProducto',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        productoId: this.id.toString(),
        varianteId: varianteId.toString(),
      },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  cambiarPrecioDeVariante(
    varianteId: ProductVariantId,
    nuevoPrecio: Money,
    ahora: FechaHora,
    eventoId: string,
  ): Result<Product, VarianteNoEncontradaError | PrecioInvalidoError> {
    const variante = this.variantes.find((v) => v.id.equals(varianteId));
    if (!variante) return err(new VarianteNoEncontradaError(varianteId.toString()));

    const nuevaRes = variante.conPrecio(nuevoPrecio);
    if (!nuevaRes.ok) return err(nuevaRes.error);

    const nuevasVariantes = this.variantes.map((v) =>
      v.id.equals(varianteId) ? nuevaRes.value : v,
    );
    const nuevo = this._con({ variantes: nuevasVariantes });

    const evento: PrecioDeVarianteCambiadoEvent = {
      eventoId,
      tipo: 'PrecioDeVarianteCambiado',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        productoId: this.id.toString(),
        varianteId: varianteId.toString(),
        precioAnteriorCop: variante.precio.toCop(),
        precioNuevoCop: nuevoPrecio.toCop(),
      },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  vincularRecetaAVariante(
    varianteId: ProductVariantId,
    recetaId: import('../value-objects/ids.js').RecipeId,
    ahora: FechaHora,
    eventoId: string,
  ): Result<Product, VarianteNoEncontradaError> {
    const variante = this.variantes.find((v) => v.id.equals(varianteId));
    if (!variante) return err(new VarianteNoEncontradaError(varianteId.toString()));

    const varianteActualizada = variante.conReceta(recetaId);
    const nuevasVariantes = this.variantes.map((v) =>
      v.id.equals(varianteId) ? varianteActualizada : v,
    );
    const nuevo = this._con({ variantes: nuevasVariantes });

    const evento: RecetaVinculadaAVarianteEvent = {
      eventoId,
      tipo: 'RecetaVinculadaAVariante',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        productoId: this.id.toString(),
        varianteId: varianteId.toString(),
        recetaId: recetaId.toString(),
      },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  cambiarNombre(
    nuevoNombre: NombreDeCatalogo,
    ahora: FechaHora,
    eventoId: string,
  ): Result<Product, never> {
    const nuevo = this._con({ nombre: nuevoNombre });
    const evento: NombreDeProductoCambiadoEvent = {
      eventoId,
      tipo: 'NombreDeProductoCambiado',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        productoId: this.id.toString(),
        nombreAnterior: this.nombre.toString(),
        nombreNuevo: nuevoNombre.toString(),
      },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  cambiarCategoria(
    nuevaCategoriaId: CategoryId,
    ahora: FechaHora,
    eventoId: string,
  ): Result<Product, never> {
    const nuevo = this._con({ categoriaId: nuevaCategoriaId });
    const evento: CategoriaDeProductoCambiadaEvent = {
      eventoId,
      tipo: 'CategoriaDeProductoCambiada',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        productoId: this.id.toString(),
        categoriaAnteriorId: this.categoriaId.toString(),
        categoriaNuevaId: nuevaCategoriaId.toString(),
      },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  cambiarImagen(
    nuevaImagenUrl: string | null,
    ahora: FechaHora,
    eventoId: string,
  ): Result<Product, never> {
    const nuevo = this._con({ imagenUrl: nuevaImagenUrl });
    const evento: ImagenDeProductoCambiadaEvent = {
      eventoId,
      tipo: 'ImagenDeProductoCambiada',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        productoId: this.id.toString(),
        imagenAnteriorUrl: this.imagenUrl,
        imagenNuevaUrl: nuevaImagenUrl,
      },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  activar(
    ahora: FechaHora,
    eventoId: string,
  ): Result<Product, ProductoYaEnEstadoError> {
    if (this.estado === 'activo')
      return err(new ProductoYaEnEstadoError(this.id.toString(), 'activo'));

    const nuevo = this._con({ estado: 'activo' });
    const evento: ProductoActivadoEvent = {
      eventoId,
      tipo: 'ProductoActivado',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        productoId: this.id.toString(),
      },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  desactivar(
    motivo: string,
    ahora: FechaHora,
    eventoId: string,
  ): Result<Product, ProductoYaEnEstadoError> {
    if (this.estado === 'borrador')
      return err(new ProductoYaEnEstadoError(this.id.toString(), 'borrador'));

    const nuevo = this._con({ estado: 'borrador' });
    const evento: ProductoDesactivadoEvent = {
      eventoId,
      tipo: 'ProductoDesactivado',
      aggregateId: this.id.toString(),
      ocurridoEn: ahora.toTimestamp(),
      version: 1,
      payload: {
        productoId: this.id.toString(),
        motivo,
      },
    };
    nuevo._events.push(...this._events, evento);
    return ok(nuevo);
  }

  // ── Consultas puras ─────────────────────────────────────────

  /**
   * Calcula el `Margen` de una variante específica dado su escandallo.
   *
   * Solo aplica a variantes elaboradas (`recetaId !== null`). Para variantes
   * de reventa el costo viene de Inventory y el caso de uso debe bifurcar
   * antes de invocar este método.
   *
   * **Política de autorización**: este método NO verifica roles. La capa de
   * aplicación debe asegurarse de invocarlo solo desde casos de uso
   * autorizados a ADMIN/SUPERADMIN.
   */
  calcularMargen(
    varianteId: ProductVariantId,
    receta: Recipe,
    costos: ReadonlyMap<string, Money>,
  ): Result<
    Margen,
    | VarianteNoEncontradaError
    | RecetaNoCorrespondeAVarianteError
    | CostoIngredienteNoDisponibleError
    | CostoCeroSospechosoError
    | MoneyInvalidoError
  > {
    const variante = this.variantes.find((v) => v.id.equals(varianteId));
    if (!variante) return err(new VarianteNoEncontradaError(varianteId.toString()));

    if (!receta.varianteId.equals(varianteId))
      return err(
        new RecetaNoCorrespondeAVarianteError(varianteId.toString(), receta.id.toString()),
      );

    const costoRes = receta.calcularCosto(costos);
    if (!costoRes.ok) return err(costoRes.error);

    return Margen.calcular(variante.precio, costoRes.value);
  }

  estaDisponibleParaVenta(): boolean {
    return this.estado === 'activo' && this.variantes.length > 0;
  }

  pullDomainEvents(): CatalogDomainEvent[] {
    return [...this._events];
  }

  // ── Helpers ─────────────────────────────────────────────────

  private _props(): ProductProps {
    return {
      id: this.id,
      nombre: this.nombre,
      categoriaId: this.categoriaId,
      imagenUrl: this.imagenUrl,
      variantes: this.variantes,
      estado: this.estado,
      creadoEn: this.creadoEn,
    };
  }

  private _con(overrides: ProductPropsOverride): Product {
    return new Product({ ...this._props(), ...overrides }, []);
  }

  static reconstituir(props: ProductProps): Product {
    return new Product(props, []);
  }
}

type ProductPropsOverride =
  | { readonly variantes: ReadonlyArray<ProductVariant> }
  | { readonly nombre: NombreDeCatalogo }
  | { readonly categoriaId: CategoryId }
  | { readonly imagenUrl: string | null }
  | { readonly estado: EstadoDeProducto };
