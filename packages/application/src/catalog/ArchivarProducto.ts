import {
  type Result,
  ok,
  err,
  ProductId,
  FechaHora,
  type IdInvalidoError,
  type ProductoYaEnEstadoError,
  ProductoNoEncontradoError,
} from '@zahavi/domain-catalog';
import type { IProductRepository, IPublicadorDeDomainEventsCatalog } from '@zahavi/ports';

export interface EntradaArchivarProducto {
  productoId: string;
  motivo: string;
  actorRol: string;
  correlacionId: string;
}

export interface SalidaArchivarProducto {
  productoId: string;
  estado: string;
}

type ErrorArchivarProducto =
  | IdInvalidoError
  | ProductoNoEncontradoError
  | ProductoYaEnEstadoError;

export class ArchivarProducto {
  constructor(
    private readonly productRepo: IProductRepository,
    private readonly publicador: IPublicadorDeDomainEventsCatalog,
  ) {}

  async execute(
    entrada: EntradaArchivarProducto,
  ): Promise<Result<SalidaArchivarProducto, ErrorArchivarProducto>> {
    const idRes = ProductId.of(entrada.productoId);
    if (!idRes.ok) return idRes;

    const producto = await this.productRepo.getById(idRes.value);
    if (!producto) return err(new ProductoNoEncontradoError(entrada.productoId));

    const ahora = FechaHora.deTimestamp(Date.now());
    const eventoId = crypto.randomUUID();

    const desactivadoRes = producto.desactivar(entrada.motivo, ahora, eventoId);
    if (!desactivadoRes.ok) return desactivadoRes;
    const desactivado = desactivadoRes.value;

    await this.productRepo.update(desactivado, entrada.correlacionId);

    const eventos = desactivado.pullDomainEvents();
    for (const evento of eventos) {
      await this.publicador.publicar(evento, entrada.correlacionId);
    }

    return ok({ productoId: entrada.productoId, estado: desactivado.estado });
  }
}
