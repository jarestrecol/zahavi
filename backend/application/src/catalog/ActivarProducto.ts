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

export interface EntradaActivarProducto {
  productoId: string;
  actorRol: string;
  correlacionId: string;
}

export interface SalidaActivarProducto {
  productoId: string;
  estado: string;
}

type ErrorActivarProducto = IdInvalidoError | ProductoNoEncontradoError | ProductoYaEnEstadoError;

export class ActivarProducto {
  constructor(
    private readonly productRepo: IProductRepository,
    private readonly publicador: IPublicadorDeDomainEventsCatalog,
  ) {}

  async execute(
    entrada: EntradaActivarProducto,
  ): Promise<Result<SalidaActivarProducto, ErrorActivarProducto>> {
    const idRes = ProductId.of(entrada.productoId);
    if (!idRes.ok) return idRes;

    const producto = await this.productRepo.getById(idRes.value);
    if (!producto) return err(new ProductoNoEncontradoError(entrada.productoId));

    const ahora = FechaHora.deTimestamp(Date.now());
    const eventoId = crypto.randomUUID();

    const activadoRes = producto.activar(ahora, eventoId);
    if (!activadoRes.ok) return activadoRes;
    const activado = activadoRes.value;

    await this.productRepo.update(activado, entrada.correlacionId);

    const eventos = activado.pullDomainEvents();
    for (const evento of eventos) {
      await this.publicador.publicar(evento, entrada.correlacionId);
    }

    return ok({ productoId: entrada.productoId, estado: activado.estado });
  }
}
