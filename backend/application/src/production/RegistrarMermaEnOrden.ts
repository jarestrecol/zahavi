import { type Result, ok, err, FechaHora } from '@zahavi/domain-shared-kernel';
import {
  OrdenDeProduccionId,
  RegistroDeMerma,
  RegistroDeMermaId,
  IngredientIdRef,
  UsuarioIdRef,
  Cantidad,
  UnidadDeMedida,
  IdInvalidoError,
  MermaFueraDeEjecucionError,
  MermaSinMotivoError,
  MermaExcedeConsumoError,
  CantidadInvalidaError,
  OrdenNoEncontradaError,
  UnidadInvalidaError,
} from '@zahavi/domain-production';
import type { IOrdenDeProduccionRepository } from '@zahavi/ports';

export interface EntradaRegistrarMerma {
  readonly ordenId: string;
  readonly ingredientId: string;
  readonly cantidad: number;
  readonly unidad: string;
  readonly motivo: string;
  readonly registradaPor: string;
}

export interface SalidaRegistrarMerma {
  readonly mermaId: string;
  readonly ordenId: string;
}

type ErrorRegistrarMerma =
  | IdInvalidoError
  | MermaFueraDeEjecucionError
  | MermaSinMotivoError
  | MermaExcedeConsumoError
  | CantidadInvalidaError
  | OrdenNoEncontradaError
  | UnidadInvalidaError;

/** Registra una merma de ingrediente durante la ejecución de la orden. */
export class RegistrarMermaEnOrden {
  constructor(private readonly reposOrdenes: IOrdenDeProduccionRepository) {}

  async execute(
    entrada: EntradaRegistrarMerma,
    correlacionId: string,
  ): Promise<Result<SalidaRegistrarMerma, ErrorRegistrarMerma>> {
    const ordenIdRes = OrdenDeProduccionId.of(entrada.ordenId);
    if (!ordenIdRes.ok) return err(ordenIdRes.error);

    const ingIdRes = IngredientIdRef.of(entrada.ingredientId);
    if (!ingIdRes.ok) return err(ingIdRes.error);

    const usuarioIdRes = UsuarioIdRef.of(entrada.registradaPor);
    if (!usuarioIdRes.ok) return err(usuarioIdRes.error);

    const unidad = Object.values(UnidadDeMedida).find((u) => u === entrada.unidad);
    if (!unidad) return err(new UnidadInvalidaError(entrada.unidad));

    const cantRes = Cantidad.de(entrada.cantidad, unidad);
    if (!cantRes.ok) return err(cantRes.error);

    const orden = await this.reposOrdenes.obtenerPorId(ordenIdRes.value);
    if (!orden) return err(new OrdenNoEncontradaError(entrada.ordenId));

    const mermaId = RegistroDeMermaId.nuevo();
    const merma = RegistroDeMerma.crear({
      id: mermaId,
      ingredientId: ingIdRes.value,
      cantidad: cantRes.value,
      motivo: entrada.motivo,
      registradaPor: usuarioIdRes.value,
      registradaEn: FechaHora.ahora(),
    });

    const res = orden.registrarMerma(merma);
    if (!res.ok) return err(res.error);

    await this.reposOrdenes.update(res.value, correlacionId);
    return ok({ mermaId: mermaId.toString(), ordenId: entrada.ordenId });
  }
}
