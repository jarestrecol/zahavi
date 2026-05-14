import { type Result, ok, err, FechaHora } from '@zahavi/domain-shared-kernel';
import {
  Mesa,
  Comanda,
  Cobro,
  CobroId,
  ComandaId,
  BusinessUnitIdRef,
  UsuarioIdRef,
  Dinero,
  PagoDetalle,
  MetodoDePago,
  IdInvalidoError,
  MontoInvalidoError,
  CobrosIncompletosError,
  PagosVaciosError,
  CobroYaProcesadoError,
  ComandaNoEncontradaError,
  ComandaNoListaError,
  MetodoDePagoInvalidoError,
  TransicionDeComandaInvalidaError,
} from '@zahavi/domain-sales';
import type { IComandaRepository, ICobroRepository, IMesaRepository } from '@zahavi/ports';

export interface EntradaPago {
  readonly metodo: string;
  readonly monto: number;
}

export interface EntradaProcesarCobro {
  readonly comandaId: string;
  readonly puntoDeVentaId: string;
  readonly cobradoPor: string;
  readonly pagos: EntradaPago[];
}

export interface SalidaProcesarCobro {
  readonly cobroId: string;
  readonly totalCobrado: number;
  readonly cambio: number;
}

type ErrorProcesarCobro =
  | IdInvalidoError
  | MontoInvalidoError
  | CobrosIncompletosError
  | PagosVaciosError
  | CobroYaProcesadoError
  | TransicionDeComandaInvalidaError
  | ComandaNoEncontradaError
  | ComandaNoListaError
  | MetodoDePagoInvalidoError;

const METODOS_VALIDOS = new Set<string>(Object.values(MetodoDePago));

/**
 * Procesa el cobro de una comanda LISTA.
 *
 * Flujo:
 * 1. Obtiene la comanda y valida que esté LISTA.
 * 2. Crea el Cobro y lo procesa con los pagos indicados.
 * 3. Cierra la comanda.
 * 4. Libera la mesa.
 * 5. Persiste todo.
 */
export class ProcesarCobro {
  constructor(
    private readonly repoComanadas: IComandaRepository,
    private readonly repoCobros: ICobroRepository,
    private readonly repoMesas: IMesaRepository,
  ) {}

  async execute(
    entrada: EntradaProcesarCobro,
    correlacionId: string,
  ): Promise<Result<SalidaProcesarCobro, ErrorProcesarCobro>> {
    const comandaIdRes = ComandaId.of(entrada.comandaId);
    if (!comandaIdRes.ok) return err(comandaIdRes.error);

    const puntoRes = BusinessUnitIdRef.of(entrada.puntoDeVentaId);
    if (!puntoRes.ok) return err(puntoRes.error);

    const cajeroRes = UsuarioIdRef.of(entrada.cobradoPor);
    if (!cajeroRes.ok) return err(cajeroRes.error);

    const comanda: Comanda | null = await this.repoComanadas.obtenerPorId(comandaIdRes.value);
    if (!comanda) {
      return err(new ComandaNoEncontradaError(entrada.comandaId));
    }
    if (comanda.estado !== 'LISTA') {
      return err(new ComandaNoListaError(comanda.estado));
    }

    // Construir pagos
    const pagos: PagoDetalle[] = [];
    for (const p of entrada.pagos) {
      if (!METODOS_VALIDOS.has(p.metodo)) {
        return err(new MetodoDePagoInvalidoError(p.metodo));
      }
      const montoRes = Dinero.de(p.monto);
      if (!montoRes.ok) return err(montoRes.error);
      pagos.push(PagoDetalle.crear(p.metodo as MetodoDePago, montoRes.value));
    }

    const ahora = FechaHora.ahora();
    const cobroId = CobroId.nuevo();

    const cobro = Cobro.crear(
      {
        id: cobroId,
        comandaId: comandaIdRes.value,
        puntoDeVentaId: puntoRes.value,
        totalComanda: comanda.totalConIVA,
        cobradoPor: cajeroRes.value,
        ahora,
      },
      correlacionId,
    );

    const cobroProcesadoRes = cobro.procesar(pagos, ahora, correlacionId);
    if (!cobroProcesadoRes.ok) return err(cobroProcesadoRes.error);

    const comandaCerradaRes = comanda.cerrar(cajeroRes.value, ahora, correlacionId);
    if (!comandaCerradaRes.ok) return err(comandaCerradaRes.error);

    // Liberar la mesa si la comanda estaba vinculada a una
    const mesa: Mesa | null = comanda.mesaId
      ? await this.repoMesas.obtenerPorId(comanda.mesaId)
      : null;

    const saves: Promise<void>[] = [
      this.repoCobros.save(cobroProcesadoRes.value, correlacionId),
      this.repoComanadas.update(comandaCerradaRes.value, correlacionId),
    ];

    if (mesa) {
      const mesaLiberadaRes = mesa.liberar(ahora, correlacionId);
      if (mesaLiberadaRes.ok) {
        saves.push(this.repoMesas.update(mesaLiberadaRes.value, correlacionId));
      }
    }

    await Promise.all(saves);

    return ok({
      cobroId: cobroId.toString(),
      totalCobrado: cobroProcesadoRes.value.totalCobrado.valor,
      cambio: cobroProcesadoRes.value.cambio.valor,
    });
  }
}
