import {
  type Result,
  ok,
  err,
  CategoryId,
  FechaHora,
  type IdInvalidoError,
  type CategoriaYaEnEstadoError,
  CategoriaNoEncontradaError,
  CategoriaConProductosActivosError,
} from '@zahavi/domain-catalog';
import type { ICategoryRepository, IPublicadorDeDomainEventsCatalog } from '@zahavi/ports';

export interface EntradaArchivarCategoria {
  categoriaId: string;
  actorRol: string;
  correlacionId: string;
}

export interface SalidaArchivarCategoria {
  categoriaId: string;
  estado: string;
}

type ErrorArchivarCategoria =
  | IdInvalidoError
  | CategoriaNoEncontradaError
  | CategoriaConProductosActivosError
  | CategoriaYaEnEstadoError;

export class ArchivarCategoria {
  constructor(
    private readonly categoryRepo: ICategoryRepository,
    private readonly publicador: IPublicadorDeDomainEventsCatalog,
  ) {}

  async execute(
    entrada: EntradaArchivarCategoria,
  ): Promise<Result<SalidaArchivarCategoria, ErrorArchivarCategoria>> {
    const idRes = CategoryId.of(entrada.categoriaId);
    if (!idRes.ok) return idRes;

    const categoria = await this.categoryRepo.getById(idRes.value);
    if (!categoria) return err(new CategoriaNoEncontradaError(entrada.categoriaId));

    const tieneProductosActivos = await this.categoryRepo.hasActiveProducts(idRes.value);
    if (tieneProductosActivos) {
      return err(new CategoriaConProductosActivosError(entrada.categoriaId));
    }

    const ahora = FechaHora.deTimestamp(Date.now());
    const eventoId = crypto.randomUUID();

    const archivadaRes = categoria.archivar(ahora, eventoId);
    if (!archivadaRes.ok) return archivadaRes;
    const archivada = archivadaRes.value;

    await this.categoryRepo.update(archivada, entrada.correlacionId);

    const eventos = archivada.pullDomainEvents();
    for (const evento of eventos) {
      await this.publicador.publicar(evento, entrada.correlacionId);
    }

    return ok({ categoriaId: entrada.categoriaId, estado: archivada.estado });
  }
}
