import {
  type Result,
  ok,
  err,
  NombreDeCatalogo,
  CategoryId,
  ProductId,
  ProductVariantId,
  Money,
  ProductVariant,
  Product,
  FechaHora,
  type NombreDeCatalogoInvalidoError,
  type IdInvalidoError,
  type PrecioInvalidoError,
  type MoneyInvalidoError,
  CategoriaNoEncontradaError,
  CategoriaNoHojaError,
  RolNoAutorizadoCatalogError,
} from '@zahavi/domain-catalog';
import type {
  IProductRepository,
  ICategoryRepository,
  IPublicadorDeDomainEventsCatalog,
} from '@zahavi/ports';

export interface EntradaCrearProducto {
  nombre: string;
  categoriaId: string;
  imagenUrl: string | null;
  varianteInicial: { nombre: string; precioCop: number };
  actorRol: string;
  correlacionId: string;
}

export interface SalidaCrearProducto {
  productoId: string;
  varianteId: string;
}

type ErrorCrearProducto =
  | RolNoAutorizadoCatalogError
  | NombreDeCatalogoInvalidoError
  | IdInvalidoError
  | PrecioInvalidoError
  | MoneyInvalidoError
  | CategoriaNoEncontradaError
  | CategoriaNoHojaError;

export class CrearProducto {
  constructor(
    private readonly productRepo: IProductRepository,
    private readonly categoryRepo: ICategoryRepository,
    private readonly publicador: IPublicadorDeDomainEventsCatalog,
  ) {}

  async execute(
    entrada: EntradaCrearProducto,
  ): Promise<Result<SalidaCrearProducto, ErrorCrearProducto>> {
    if (entrada.actorRol !== 'ADMIN' && entrada.actorRol !== 'SUPERADMIN') {
      return err(new RolNoAutorizadoCatalogError(entrada.actorRol, 'CrearProducto'));
    }

    const nombreRes = NombreDeCatalogo.of(entrada.nombre);
    if (!nombreRes.ok) return nombreRes;
    const nombre = nombreRes.value;

    const categoriaIdRes = CategoryId.of(entrada.categoriaId);
    if (!categoriaIdRes.ok) return categoriaIdRes;
    const categoriaId = categoriaIdRes.value;

    const categoria = await this.categoryRepo.getById(categoriaId);
    if (!categoria) return err(new CategoriaNoEncontradaError(entrada.categoriaId));

    const hijos = await this.categoryRepo.getByParentId(categoriaId);
    if (hijos.length > 0) return err(new CategoriaNoHojaError(entrada.categoriaId));

    const varianteNombreRes = NombreDeCatalogo.of(entrada.varianteInicial.nombre);
    if (!varianteNombreRes.ok) return varianteNombreRes;

    const precioRes = Money.deCop(entrada.varianteInicial.precioCop);
    if (!precioRes.ok) return precioRes;

    const varianteId = ProductVariantId.of(crypto.randomUUID());
    if (!varianteId.ok) return varianteId;

    const varianteRes = ProductVariant.crear({
      id: varianteId.value,
      nombre: varianteNombreRes.value,
      precio: precioRes.value,
      recetaId: null,
    });
    if (!varianteRes.ok) return varianteRes;

    const productoId = ProductId.of(crypto.randomUUID());
    if (!productoId.ok) return productoId;

    const ahora = FechaHora.deTimestamp(Date.now());
    const eventoId = crypto.randomUUID();

    const productoRes = Product.crear(
      {
        id: productoId.value,
        nombre,
        categoriaId,
        imagenUrl: entrada.imagenUrl,
        varianteInicial: varianteRes.value,
        ahora,
      },
      eventoId,
    );
    if (!productoRes.ok) return productoRes;
    const producto = productoRes.value;

    await this.productRepo.save(producto, entrada.correlacionId);

    const eventos = producto.pullDomainEvents();
    for (const evento of eventos) {
      await this.publicador.publicar(evento, entrada.correlacionId);
    }

    return ok({
      productoId: productoId.value.toString(),
      varianteId: varianteId.value.toString(),
    });
  }
}
