import {
  type Result,
  ok,
  err,
  NombreDeCatalogo,
  CategoryId,
  Category,
  FechaHora,
  type NombreDeCatalogoInvalidoError,
  type IdInvalidoError,
  type OrdenInvalidoError,
  type AutoReferenciaDeCategoriaError,
  CategoriaNoEncontradaError,
  RolNoAutorizadoCatalogError,
} from '@zahavi/domain-catalog';
import type { ICategoryRepository, IPublicadorDeDomainEventsCatalog } from '@zahavi/ports';

const MAX_PROFUNDIDAD = 3;

export class ProfundidadMaximaDeCategoriaError extends Error {
  readonly code = 'CATALOG_PROFUNDIDAD_MAXIMA';
  constructor(padreId: string, profundidad: number) {
    super(
      `La categoría padre "${padreId}" está a profundidad ${profundidad}. ` +
        `No se puede agregar hijos (máximo ${MAX_PROFUNDIDAD} niveles).`,
    );
    this.name = 'ProfundidadMaximaDeCategoriaError';
  }
}

export interface EntradaCrearCategoria {
  nombre: string;
  padreId: string | null;
  orden: number;
  actorRol: string;
  correlacionId: string;
}

export interface SalidaCrearCategoria {
  categoriaId: string;
}

type ErrorCrearCategoria =
  | RolNoAutorizadoCatalogError
  | NombreDeCatalogoInvalidoError
  | IdInvalidoError
  | OrdenInvalidoError
  | AutoReferenciaDeCategoriaError
  | CategoriaNoEncontradaError
  | ProfundidadMaximaDeCategoriaError;

export class CrearCategoria {
  constructor(
    private readonly categoryRepo: ICategoryRepository,
    private readonly publicador: IPublicadorDeDomainEventsCatalog,
  ) {}

  async execute(
    entrada: EntradaCrearCategoria,
  ): Promise<Result<SalidaCrearCategoria, ErrorCrearCategoria>> {
    if (entrada.actorRol !== 'ADMIN' && entrada.actorRol !== 'SUPERADMIN') {
      return err(new RolNoAutorizadoCatalogError(entrada.actorRol, 'CrearCategoria'));
    }

    const nombreRes = NombreDeCatalogo.of(entrada.nombre);
    if (!nombreRes.ok) return nombreRes;
    const nombre = nombreRes.value;

    let padreId: CategoryId | null = null;
    if (entrada.padreId !== null) {
      const padreIdRes = CategoryId.of(entrada.padreId);
      if (!padreIdRes.ok) return padreIdRes;
      padreId = padreIdRes.value;

      const padre = await this.categoryRepo.getById(padreId);
      if (!padre) return err(new CategoriaNoEncontradaError(entrada.padreId));

      const profundidadPadre = await this.categoryRepo.getDepth(padreId);
      if (profundidadPadre + 1 >= MAX_PROFUNDIDAD) {
        return err(new ProfundidadMaximaDeCategoriaError(entrada.padreId, profundidadPadre));
      }
    }

    const categoriaId = CategoryId.of(crypto.randomUUID());
    if (!categoriaId.ok) return categoriaId;

    const ahora = FechaHora.deTimestamp(Date.now());
    const eventoId = crypto.randomUUID();

    const categoriaRes = Category.crear(
      {
        id: categoriaId.value,
        nombre,
        padreId,
        orden: entrada.orden,
        ahora,
      },
      eventoId,
    );
    if (!categoriaRes.ok) return categoriaRes;
    const categoria = categoriaRes.value;

    await this.categoryRepo.save(categoria, entrada.correlacionId);

    const eventos = categoria.pullDomainEvents();
    for (const evento of eventos) {
      await this.publicador.publicar(evento, entrada.correlacionId);
    }

    return ok({ categoriaId: categoriaId.value.toString() });
  }
}
