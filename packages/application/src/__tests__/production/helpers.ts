import { vi } from 'vitest';
import { FechaHora } from '@zahavi/domain-shared-kernel';
import {
  OrdenDeProduccion,
  DespachoAPunto,
  LineaDeBOM,
  RegistroDeMerma,
  CodigoDeLote,
  Cantidad,
  OrdenDeProduccionId,
  LineaDeBOMId,
  RegistroDeMermaId,
  DespachoId,
  ProductVariantIdRef,
  RecipeIdRef,
  BusinessUnitIdRef,
  UsuarioIdRef,
  IngredientIdRef,
  UnidadDeMedida,
} from '@zahavi/domain-production';
import type {
  IOrdenDeProduccionRepository,
  IDespachoRepository,
  IConsultorDeRecetaDeProduccion,
  LineaDeRecetaParaProduccion,
} from '@zahavi/ports';

// ── UUIDs fijos ──────────────────────────────────────────────────

export const UUID_ORDEN = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
export const UUID_VARIANTE = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
export const UUID_RECETA = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
export const UUID_PLANTA = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
export const UUID_USUARIO = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
export const UUID_ING_A = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
export const UUID_ING_B = '00000000-0000-0000-0000-000000000001';
export const UUID_PUNTO = '11111111-1111-1111-1111-111111111111';
export const UUID_CORRELACION = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

export const AHORA = FechaHora.deTimestamp(1_700_000_000_000);

const BOM_LINE_A_ID = 'a1111111-1111-1111-1111-111111111111';
const BOM_LINE_B_ID = 'b2222222-2222-2222-2222-222222222222';

// ── Helpers internos ─────────────────────────────────────────────

function unwrap<T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!r.ok) throw new Error(`unwrap falló: ${JSON.stringify(r.error)}`);
  return r.value;
}

function kgs(n: number): Cantidad {
  return unwrap(Cantidad.de(n, UnidadDeMedida.KILOGRAMO));
}

// ── Fixtures de dominio ──────────────────────────────────────────

export const ordenId = unwrap(OrdenDeProduccionId.of(UUID_ORDEN));
export const varianteId = unwrap(ProductVariantIdRef.of(UUID_VARIANTE));
export const recetaId = unwrap(RecipeIdRef.of(UUID_RECETA));
export const plantaId = unwrap(BusinessUnitIdRef.of(UUID_PLANTA));
export const usuarioId = unwrap(UsuarioIdRef.of(UUID_USUARIO));
export const ingA = unwrap(IngredientIdRef.of(UUID_ING_A));
export const ingB = unwrap(IngredientIdRef.of(UUID_ING_B));
export const puntoId = unwrap(BusinessUnitIdRef.of(UUID_PUNTO));

function bomLinea(lineaId: string, ing: IngredientIdRef, kg: number): LineaDeBOM {
  return LineaDeBOM.crear({
    id: unwrap(LineaDeBOMId.of(lineaId)),
    ingredientId: ing,
    cantidadRequerida: kgs(kg),
  });
}

export function makeOrdenPlanificada(cantidadAProducir = 10): OrdenDeProduccion {
  return unwrap(
    OrdenDeProduccion.crear(
      {
        id: ordenId,
        varianteId,
        recetaId,
        plantaCentralId: plantaId,
        cantidadAProducir,
        creadaPor: usuarioId,
        ahora: AHORA,
      },
      crypto.randomUUID(),
    ),
  );
}

export function makeOrdenConBOM(): OrdenDeProduccion {
  return unwrap(
    makeOrdenPlanificada().calcularBOM(
      [bomLinea(BOM_LINE_A_ID, ingA, 5), bomLinea(BOM_LINE_B_ID, ingB, 2)],
      AHORA,
      crypto.randomUUID(),
    ),
  );
}

export function makeOrdenReservada(): OrdenDeProduccion {
  return unwrap(makeOrdenConBOM().reservarIngredientes(AHORA, crypto.randomUUID()));
}

export function makeOrdenEnEjecucion(): OrdenDeProduccion {
  return unwrap(makeOrdenReservada().iniciar(usuarioId, AHORA, crypto.randomUUID()));
}

export function makeOrdenEjecutada(): OrdenDeProduccion {
  const loteCode = unwrap(CodigoDeLote.of('LOTE-20260514-0001'));
  return unwrap(
    makeOrdenEnEjecucion().ejecutar(10, loteCode, usuarioId, AHORA, crypto.randomUUID()),
  );
}

export function makeMerma(ing: IngredientIdRef, kg: number): RegistroDeMerma {
  return RegistroDeMerma.crear({
    id: RegistroDeMermaId.nuevo(),
    ingredientId: ing,
    cantidad: kgs(kg),
    motivo: 'Derrame accidental',
    registradaPor: usuarioId,
    registradaEn: AHORA,
  });
}

export function makeDespacho(): DespachoAPunto {
  const ord = makeOrdenEjecutada();
  const lote = ord.lote;
  if (!lote) throw new Error('makeOrdenEjecutada debe tener lote');
  const loteCode = unwrap(CodigoDeLote.of(lote.codigo.toString()));
  return unwrap(
    DespachoAPunto.preparar(
      {
        id: DespachoId.nuevo(),
        ordenId: ord.id,
        codigoLote: loteCode,
        cantidadDespachada: 8,
        loteCantidadTotal: lote.cantidadProducida,
        plantaCentralId: plantaId,
        puntoDeVentaDestinoId: puntoId,
        preparadoPor: usuarioId,
        ahora: AHORA,
      },
      crypto.randomUUID(),
    ),
  );
}

// ── Lineas de receta ACL por defecto ─────────────────────────────

export const LINEAS_RECETA_DEFAULT: LineaDeRecetaParaProduccion[] = [
  { ingredientId: UUID_ING_A, cantidadPorUnidad: 0.5, unidad: UnidadDeMedida.KILOGRAMO },
  { ingredientId: UUID_ING_B, cantidadPorUnidad: 0.2, unidad: UnidadDeMedida.KILOGRAMO },
];

// ── Mocks de ports ───────────────────────────────────────────────

export function makeMockOrdenRepo(
  defaultOrden: OrdenDeProduccion | null = null,
): IOrdenDeProduccionRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    obtenerPorId: vi.fn().mockResolvedValue(defaultOrden),
    listarPorEstado: vi.fn().mockResolvedValue([]),
    listarPorPlanta: vi.fn().mockResolvedValue([]),
  };
}

export function makeMockDespachoRepo(
  overrides: Partial<IDespachoRepository> = {},
): IDespachoRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    obtenerPorId: vi.fn().mockResolvedValue(null),
    listarPorOrden: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

export function makeMockConsultorDeReceta(
  lineas: LineaDeRecetaParaProduccion[] = LINEAS_RECETA_DEFAULT,
): IConsultorDeRecetaDeProduccion {
  return {
    obtenerLineasDeReceta: vi.fn().mockResolvedValue(lineas),
  };
}
