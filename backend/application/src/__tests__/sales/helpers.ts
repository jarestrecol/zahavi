import { vi } from 'vitest';
import { FechaHora } from '@zahavi/domain-shared-kernel';
import {
  Mesa,
  Comanda,
  Cobro,
  Factura,
  MesaId,
  ComandaId,
  CobroId,
  FacturaId,
  LineaDeComandaId,
  BusinessUnitIdRef,
  UsuarioIdRef,
  ProductVariantIdRef,
  NombreMesa,
  NumeroFactura,
  Dinero,
  TasaIVA,
  PagoDetalle,
  FacturaLinea,
  MetodoDePago,
  EstadoDeComanda,
} from '@zahavi/domain-sales';
import type {
  IMesaRepository,
  IComandaRepository,
  ICobroRepository,
  IFacturaRepository,
  IConsultorDeProductoParaVentas,
  DatosDeVentaDeProducto,
} from '@zahavi/ports';

// ── UUIDs fijos ──────────────────────────────────────────────────

export const UUID_MESA = '11111111-1111-1111-1111-111111111111';
export const UUID_COMANDA = '22222222-2222-2222-2222-222222222222';
export const UUID_COBRO = '33333333-3333-3333-3333-333333333333';
export const UUID_FACTURA = '44444444-4444-4444-4444-444444444444';
export const UUID_LINEA = '55555555-5555-5555-5555-555555555555';
export const UUID_PUNTO = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
export const UUID_USUARIO = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
export const UUID_VARIANTE = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
export const UUID_CORRELACION = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

export const AHORA = FechaHora.deTimestamp(1_700_000_000_000);

// ── Helpers internos ─────────────────────────────────────────────

function unwrap<T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!r.ok) throw new Error(`unwrap falló: ${JSON.stringify(r)}`);
  return r.value;
}

// ── IDs ─────────────────────────────────────────────────────────

export const mesaId = unwrap(MesaId.of(UUID_MESA));
export const comandaId = unwrap(ComandaId.of(UUID_COMANDA));
export const cobroId = unwrap(CobroId.of(UUID_COBRO));
export const facturaId = unwrap(FacturaId.of(UUID_FACTURA));
export const lineaId = unwrap(LineaDeComandaId.of(UUID_LINEA));
export const puntoId = unwrap(BusinessUnitIdRef.of(UUID_PUNTO));
export const usuarioId = unwrap(UsuarioIdRef.of(UUID_USUARIO));
export const varianteId = unwrap(ProductVariantIdRef.of(UUID_VARIANTE));

// ── Fixtures de dominio ──────────────────────────────────────────

export function makeMesaLibre(): Mesa {
  return Mesa.configurar(
    { id: mesaId, nombre: unwrap(NombreMesa.of('Mesa 1')), puntoDeVentaId: puntoId, ahora: AHORA },
    UUID_CORRELACION,
  );
}

export function makeMesaOcupada(): Mesa {
  return unwrap(makeMesaLibre().ocupar(comandaId, AHORA, UUID_CORRELACION));
}

export function makeComandaAbierta(): Comanda {
  return Comanda.crear(
    { id: comandaId, mesaId, puntoDeVentaId: puntoId, tomadaPor: usuarioId, ahora: AHORA },
    UUID_CORRELACION,
  );
}

export function makeComandaConLinea(): Comanda {
  return unwrap(
    makeComandaAbierta().agregarLinea(
      {
        lineaId,
        producto: {
          varianteId,
          nombreProducto: 'Croissant',
          precioUnitario: unwrap(Dinero.de(4500)),
          tasaIVA: TasaIVA.CERO,
        },
        cantidad: 2,
        ahora: AHORA,
      },
      UUID_CORRELACION,
    ),
  );
}

export function makeComandaLista(): Comanda {
  const c0 = makeComandaConLinea();
  const c1 = unwrap(c0.enviar(AHORA, UUID_CORRELACION));
  const c2 = unwrap(c1.marcarEnPreparacion(AHORA, UUID_CORRELACION));
  return unwrap(c2.marcarLista(AHORA, UUID_CORRELACION));
}

export function makeCobroPendiente(totalComanda = 9000): Cobro {
  return Cobro.crear(
    {
      id: cobroId,
      comandaId,
      puntoDeVentaId: puntoId,
      totalComanda: unwrap(Dinero.de(totalComanda)),
      cobradoPor: usuarioId,
      ahora: AHORA,
    },
    UUID_CORRELACION,
  );
}

export function makeCobroProcesado(): Cobro {
  return unwrap(
    makeCobroPendiente(9000).procesar(
      [PagoDetalle.crear(MetodoDePago.EFECTIVO, unwrap(Dinero.de(9000)))],
      AHORA,
      UUID_CORRELACION,
    ),
  );
}

export function makeFacturaEmitida(): Factura {
  return Factura.emitir(
    {
      id: facturaId,
      cobroId,
      comandaId,
      puntoDeVentaId: puntoId,
      numero: unwrap(NumeroFactura.of('FAC-2026-00001')),
      lineas: [
        FacturaLinea.crear({
          varianteId: unwrap(ProductVariantIdRef.of(UUID_VARIANTE)),
          nombreProducto: 'Croissant',
          cantidad: 2,
          precioUnitario: unwrap(Dinero.de(4500)),
          tasaIVA: TasaIVA.CERO,
        }),
      ],
      ahora: AHORA,
    },
    UUID_CORRELACION,
  );
}

// ── Mocks de ports ───────────────────────────────────────────────

export function makeMockMesaRepo(defaultMesa: Mesa | null = null): IMesaRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    obtenerPorId: vi.fn().mockResolvedValue(defaultMesa),
    listarPorPunto: vi.fn().mockResolvedValue(defaultMesa ? [defaultMesa] : []),
    listarPorEstado: vi.fn().mockResolvedValue(defaultMesa ? [defaultMesa] : []),
  };
}

export function makeMockComandaRepo(defaultComanda: Comanda | null = null): IComandaRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    obtenerPorId: vi.fn().mockResolvedValue(defaultComanda),
    listarActivasPorPunto: vi.fn().mockResolvedValue(defaultComanda ? [defaultComanda] : []),
    listarPorEstado: vi.fn().mockResolvedValue(defaultComanda ? [defaultComanda] : []),
  };
}

export function makeMockCobroRepo(defaultCobro: Cobro | null = null): ICobroRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    obtenerPorId: vi.fn().mockResolvedValue(defaultCobro),
    obtenerPorComanda: vi.fn().mockResolvedValue(defaultCobro),
  };
}

export function makeMockFacturaRepo(defaultFactura: Factura | null = null): IFacturaRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    obtenerPorId: vi.fn().mockResolvedValue(defaultFactura),
    obtenerPorCobro: vi.fn().mockResolvedValue(defaultFactura),
    siguienteNumero: vi.fn().mockResolvedValue('FAC-2026-00001'),
  };
}

export const DATOS_PRODUCTO: DatosDeVentaDeProducto = {
  varianteId: UUID_VARIANTE,
  nombre: 'Croissant de mantequilla',
  precioUnitario: 4500,
  tasaIVA: 0,
};

export function makeMockConsultorProducto(
  datos: DatosDeVentaDeProducto | null = DATOS_PRODUCTO,
): IConsultorDeProductoParaVentas {
  return {
    obtenerDatosDeVenta: vi.fn().mockResolvedValue(datos),
  };
}

// Re-export EstadoDeComanda para los tests
export { EstadoDeComanda };
