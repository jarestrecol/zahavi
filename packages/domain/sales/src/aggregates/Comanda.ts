import { type Result, ok, err, FechaHora } from '@zahavi/domain-shared-kernel';
import {
  ComandaSinLineasError,
  ComandaNoModificableError,
  TransicionDeComandaInvalidaError,
  LineaNoEncontradaError,
  CantidadDeLineaInvalidaError,
  CancelacionSinMotivoError,
} from '../errors/index.js';
import {
  ComandaId,
  MesaId,
  LineaDeComandaId,
  BusinessUnitIdRef,
  UsuarioIdRef,
  ProductVariantIdRef,
} from '../value-objects/ids.js';
import { EstadoDeComanda } from '../value-objects/enums.js';
import { Dinero } from '../value-objects/Dinero.js';
import { TasaIVA } from '../value-objects/TasaIVA.js';
import { LineaDeComanda } from '../entities/LineaDeComanda.js';
import type {
  ComandaDomainEvent,
  ComandaCreada,
  LineaAgregadaAComanda,
  LineaCancelada,
  ComandaEnviada,
  ComandaEnPreparacion,
  ComandaLista,
  ComandaCerrada,
  ComandaCancelada,
} from '../events/index.js';

export interface ComandaProps {
  readonly id: ComandaId;
  readonly mesaId: MesaId;
  readonly puntoDeVentaId: BusinessUnitIdRef;
  readonly estado: EstadoDeComanda;
  readonly lineas: ReadonlyArray<LineaDeComanda>;
  readonly tomadaPor: UsuarioIdRef;
  readonly cerradaPor: UsuarioIdRef | null;
  readonly motivoCancelacion: string | null;
  readonly abiertaEn: FechaHora;
  readonly cerradaEn: FechaHora | null;
}

type ComandaOverride = Partial<
  Pick<ComandaProps, 'estado' | 'lineas' | 'cerradaPor' | 'motivoCancelacion' | 'cerradaEn'>
>;

/** Datos del producto ya resueltos por el ACL antes de llamar al dominio. */
export interface DatosDeProductoParaLinea {
  readonly varianteId: ProductVariantIdRef;
  readonly nombreProducto: string;
  readonly precioUnitario: Dinero;
  readonly tasaIVA: TasaIVA;
}

/**
 * Aggregate root `Comanda`.
 *
 * Invariantes:
 * - Solo se pueden agregar/quitar líneas en estado ABIERTA.
 * - Para enviar, debe tener al menos una línea activa (no cancelada).
 * - cantidad por línea debe ser un entero >= 1.
 * - CERRADA y CANCELADA son terminales: no acepta más comandos.
 *
 * Transiciones:
 * - ABIERTA → ENVIADA (enviar)
 * - ENVIADA → EN_PREPARACION (marcarEnPreparacion)
 * - EN_PREPARACION → LISTA (marcarLista)
 * - LISTA → CERRADA (cerrar)
 * - ABIERTA/ENVIADA/EN_PREPARACION/LISTA → CANCELADA (cancelar)
 */
export class Comanda {
  readonly id: ComandaId;
  readonly mesaId: MesaId;
  readonly puntoDeVentaId: BusinessUnitIdRef;
  readonly estado: EstadoDeComanda;
  readonly lineas: ReadonlyArray<LineaDeComanda>;
  readonly tomadaPor: UsuarioIdRef;
  readonly cerradaPor: UsuarioIdRef | null;
  readonly motivoCancelacion: string | null;
  readonly abiertaEn: FechaHora;
  readonly cerradaEn: FechaHora | null;
  readonly events: ReadonlyArray<ComandaDomainEvent>;

  private constructor(props: ComandaProps, events: ReadonlyArray<ComandaDomainEvent> = []) {
    this.id = props.id;
    this.mesaId = props.mesaId;
    this.puntoDeVentaId = props.puntoDeVentaId;
    this.estado = props.estado;
    this.lineas = props.lineas;
    this.tomadaPor = props.tomadaPor;
    this.cerradaPor = props.cerradaPor;
    this.motivoCancelacion = props.motivoCancelacion;
    this.abiertaEn = props.abiertaEn;
    this.cerradaEn = props.cerradaEn;
    this.events = events;
  }

  private with(override: ComandaOverride, event: ComandaDomainEvent): Comanda {
    return new Comanda({ ...this, ...override }, [...this.events, event]);
  }

  // ── Computed ────────────────────────────────────────────────

  get lineasActivas(): ReadonlyArray<LineaDeComanda> {
    return this.lineas.filter((l) => l.estaActiva);
  }

  get totalSinIVA(): Dinero {
    return this.lineasActivas.reduce((acc, l) => acc.sumar(l.subtotalSinIVA), Dinero.cero());
  }

  get totalIVA(): Dinero {
    return this.lineasActivas.reduce((acc, l) => acc.sumar(l.subtotalIVA), Dinero.cero());
  }

  get totalConIVA(): Dinero {
    return this.lineasActivas.reduce((acc, l) => acc.sumar(l.subtotalConIVA), Dinero.cero());
  }

  // ── Factory ─────────────────────────────────────────────────

  static crear(
    datos: {
      id: ComandaId;
      mesaId: MesaId;
      puntoDeVentaId: BusinessUnitIdRef;
      tomadaPor: UsuarioIdRef;
      ahora: FechaHora;
    },
    correlacionId: string,
  ): Comanda {
    const props: ComandaProps = {
      id: datos.id,
      mesaId: datos.mesaId,
      puntoDeVentaId: datos.puntoDeVentaId,
      estado: EstadoDeComanda.ABIERTA,
      lineas: [],
      tomadaPor: datos.tomadaPor,
      cerradaPor: null,
      motivoCancelacion: null,
      abiertaEn: datos.ahora,
      cerradaEn: null,
    };
    const event: ComandaCreada = {
      type: 'ComandaCreada',
      aggregateId: datos.id.toString(),
      correlacionId,
      ocurridoEn: datos.ahora,
      mesaId: datos.mesaId.toString(),
      puntoDeVentaId: datos.puntoDeVentaId.toString(),
      tomadaPor: datos.tomadaPor.toString(),
    };
    return new Comanda(props, [event]);
  }

  static reconstituir(props: ComandaProps): Comanda {
    return new Comanda(props, []);
  }

  // ── Comandos ────────────────────────────────────────────────

  /**
   * Agrega una línea a la comanda. Los datos del producto ya fueron resueltos
   * por el ACL (`IConsultorDeProductoParaVentas`) antes de llegar aquí.
   */
  agregarLinea(
    datos: {
      lineaId: LineaDeComandaId;
      producto: DatosDeProductoParaLinea;
      cantidad: number;
      ahora: FechaHora;
    },
    correlacionId: string,
  ): Result<Comanda, ComandaNoModificableError | CantidadDeLineaInvalidaError> {
    if (this.estado !== EstadoDeComanda.ABIERTA) {
      return err(new ComandaNoModificableError(this.estado));
    }
    if (!Number.isInteger(datos.cantidad) || datos.cantidad < 1) {
      return err(new CantidadDeLineaInvalidaError(datos.cantidad));
    }
    const linea = LineaDeComanda.crear({
      id: datos.lineaId,
      varianteId: datos.producto.varianteId,
      nombreProducto: datos.producto.nombreProducto,
      cantidad: datos.cantidad,
      precioUnitario: datos.producto.precioUnitario,
      tasaIVA: datos.producto.tasaIVA,
    });
    const event: LineaAgregadaAComanda = {
      type: 'LineaAgregadaAComanda',
      aggregateId: this.id.toString(),
      correlacionId,
      ocurridoEn: datos.ahora,
      lineaId: linea.id.toString(),
      varianteId: linea.varianteId.toString(),
      cantidad: datos.cantidad,
    };
    return ok(this.with({ lineas: [...this.lineas, linea] }, event));
  }

  /** Cancela una línea individual dentro de la comanda. */
  cancelarLinea(
    lineaId: LineaDeComandaId,
    ahora: FechaHora,
    correlacionId: string,
  ): Result<Comanda, ComandaNoModificableError | LineaNoEncontradaError> {
    if (this.estado !== EstadoDeComanda.ABIERTA) {
      return err(new ComandaNoModificableError(this.estado));
    }
    const idx = this.lineas.findIndex((l) => l.id.equals(lineaId));
    if (idx === -1) return err(new LineaNoEncontradaError(lineaId.toString()));
    const nuevasLineas = this.lineas.map((l, i) => (i === idx ? l.cancelar() : l));
    const event: LineaCancelada = {
      type: 'LineaCancelada',
      aggregateId: this.id.toString(),
      correlacionId,
      ocurridoEn: ahora,
      lineaId: lineaId.toString(),
    };
    return ok(this.with({ lineas: nuevasLineas }, event));
  }

  /** Envía la comanda a cocina (ABIERTA → ENVIADA). */
  enviar(
    ahora: FechaHora,
    correlacionId: string,
  ): Result<Comanda, TransicionDeComandaInvalidaError | ComandaSinLineasError> {
    if (this.estado !== EstadoDeComanda.ABIERTA) {
      return err(new TransicionDeComandaInvalidaError(this.estado, EstadoDeComanda.ENVIADA));
    }
    if (this.lineasActivas.length === 0) return err(new ComandaSinLineasError());
    const event: ComandaEnviada = {
      type: 'ComandaEnviada',
      aggregateId: this.id.toString(),
      correlacionId,
      ocurridoEn: ahora,
    };
    return ok(this.with({ estado: EstadoDeComanda.ENVIADA }, event));
  }

  /** Marca la comanda en preparación (ENVIADA → EN_PREPARACION). */
  marcarEnPreparacion(
    ahora: FechaHora,
    correlacionId: string,
  ): Result<Comanda, TransicionDeComandaInvalidaError> {
    if (this.estado !== EstadoDeComanda.ENVIADA) {
      return err(new TransicionDeComandaInvalidaError(this.estado, EstadoDeComanda.EN_PREPARACION));
    }
    const event: ComandaEnPreparacion = {
      type: 'ComandaEnPreparacion',
      aggregateId: this.id.toString(),
      correlacionId,
      ocurridoEn: ahora,
    };
    return ok(this.with({ estado: EstadoDeComanda.EN_PREPARACION }, event));
  }

  /** Marca la comanda lista para servir (EN_PREPARACION → LISTA). */
  marcarLista(
    ahora: FechaHora,
    correlacionId: string,
  ): Result<Comanda, TransicionDeComandaInvalidaError> {
    if (this.estado !== EstadoDeComanda.EN_PREPARACION) {
      return err(new TransicionDeComandaInvalidaError(this.estado, EstadoDeComanda.LISTA));
    }
    const event: ComandaLista = {
      type: 'ComandaLista',
      aggregateId: this.id.toString(),
      correlacionId,
      ocurridoEn: ahora,
    };
    return ok(this.with({ estado: EstadoDeComanda.LISTA }, event));
  }

  /** Cierra la comanda tras cobro exitoso (LISTA → CERRADA). */
  cerrar(
    cobradaPor: UsuarioIdRef,
    ahora: FechaHora,
    correlacionId: string,
  ): Result<Comanda, TransicionDeComandaInvalidaError> {
    if (this.estado !== EstadoDeComanda.LISTA) {
      return err(new TransicionDeComandaInvalidaError(this.estado, EstadoDeComanda.CERRADA));
    }
    const event: ComandaCerrada = {
      type: 'ComandaCerrada',
      aggregateId: this.id.toString(),
      correlacionId,
      ocurridoEn: ahora,
      cerradaPor: cobradaPor.toString(),
      totalConIVA: this.totalConIVA.valor,
    };
    return ok(
      this.with(
        { estado: EstadoDeComanda.CERRADA, cerradaPor: cobradaPor, cerradaEn: ahora },
        event,
      ),
    );
  }

  /** Cancela la comanda desde cualquier estado no terminal. */
  cancelar(
    motivo: string,
    canceladaPor: UsuarioIdRef,
    ahora: FechaHora,
    correlacionId: string,
  ): Result<Comanda, TransicionDeComandaInvalidaError | CancelacionSinMotivoError> {
    if (this.estado === EstadoDeComanda.CERRADA || this.estado === EstadoDeComanda.CANCELADA) {
      return err(new TransicionDeComandaInvalidaError(this.estado, EstadoDeComanda.CANCELADA));
    }
    if (!motivo.trim()) return err(new CancelacionSinMotivoError());
    const event: ComandaCancelada = {
      type: 'ComandaCancelada',
      aggregateId: this.id.toString(),
      correlacionId,
      ocurridoEn: ahora,
      canceladaPor: canceladaPor.toString(),
      motivo,
    };
    return ok(
      this.with(
        { estado: EstadoDeComanda.CANCELADA, motivoCancelacion: motivo, cerradaEn: ahora },
        event,
      ),
    );
  }
}
