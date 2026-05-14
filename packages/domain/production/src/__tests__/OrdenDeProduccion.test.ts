import { describe, it, expect } from 'vitest';
import { FechaHora } from '@zahavi/domain-shared-kernel';
import { OrdenDeProduccion } from '../aggregates/OrdenDeProduccion.js';
import { LineaDeBOM } from '../entities/LineaDeBOM.js';
import { RegistroDeMerma } from '../entities/RegistroDeMerma.js';
import { Cantidad } from '../value-objects/Cantidad.js';
import { CodigoDeLote } from '../value-objects/CodigoDeLote.js';
import { UnidadDeMedida, EstadoDeOrdenDeProduccion } from '../value-objects/enums.js';
import {
  OrdenDeProduccionId,
  LineaDeBOMId,
  RegistroDeMermaId,
  ProductVariantIdRef,
  RecipeIdRef,
  BusinessUnitIdRef,
  UsuarioIdRef,
  IngredientIdRef,
} from '../value-objects/ids.js';
import type { Result } from '../errors/DomainError.js';

function unwrap<T>(res: Result<T>): T {
  if (!res.ok) throw res.error;
  return res.value;
}

// ── Fixtures ───────────────────────────────────────────────────

const ahora = FechaHora.ahora();
const ordenId = OrdenDeProduccionId.nuevo();
const varianteId = unwrap(ProductVariantIdRef.of(crypto.randomUUID()));
const recetaId = unwrap(RecipeIdRef.of(crypto.randomUUID()));
const plantaId = unwrap(BusinessUnitIdRef.of(crypto.randomUUID()));
const usuarioId = unwrap(UsuarioIdRef.of(crypto.randomUUID()));
const ingA = unwrap(IngredientIdRef.of(crypto.randomUUID()));
const ingB = unwrap(IngredientIdRef.of(crypto.randomUUID()));

function cantidadKg(n: number) {
  return unwrap(Cantidad.de(n, UnidadDeMedida.KILOGRAMO));
}

function crearOrdenBase(cantidadAProducir = 10): OrdenDeProduccion {
  return unwrap(
    OrdenDeProduccion.crear(
      {
        id: ordenId,
        varianteId,
        recetaId,
        plantaCentralId: plantaId,
        cantidadAProducir,
        creadaPor: usuarioId,
        ahora,
      },
      crypto.randomUUID(),
    ),
  );
}

function lineaBOM(ingredientId: IngredientIdRef, cantidadValor: number): LineaDeBOM {
  return LineaDeBOM.crear({
    id: LineaDeBOMId.nuevo(),
    ingredientId,
    cantidadRequerida: cantidadKg(cantidadValor),
  });
}

function bomBasico(): LineaDeBOM[] {
  return [lineaBOM(ingA, 5), lineaBOM(ingB, 2)];
}

function conBOM(orden = crearOrdenBase()): OrdenDeProduccion {
  return unwrap(orden.calcularBOM(bomBasico(), ahora, crypto.randomUUID()));
}

function reservada(): OrdenDeProduccion {
  return unwrap(conBOM().reservarIngredientes(ahora, crypto.randomUUID()));
}

function enEjecucion(): OrdenDeProduccion {
  return unwrap(reservada().iniciar(usuarioId, ahora, crypto.randomUUID()));
}

// ── Tests: crear ───────────────────────────────────────────────

describe('OrdenDeProduccion.crear', () => {
  it('crea en estado PLANIFICADA con cantidad válida', () => {
    const orden = crearOrdenBase();
    expect(orden.estado).toBe(EstadoDeOrdenDeProduccion.PLANIFICADA);
    expect(orden.bom).toHaveLength(0);
  });

  it.each([0, -1, 0.5, NaN])('rechaza cantidadAProducir=%s', (n) => {
    const res = OrdenDeProduccion.crear(
      {
        id: ordenId,
        varianteId,
        recetaId,
        plantaCentralId: plantaId,
        cantidadAProducir: n,
        creadaPor: usuarioId,
        ahora,
      },
      crypto.randomUUID(),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('PRODUCTION_CANTIDAD_A_PRODUCIR_INVALIDA');
  });

  it('emite OrdenDeProduccionCreada', () => {
    const orden = crearOrdenBase();
    expect(orden.pullDomainEvents()).toHaveLength(1);
    expect(orden.pullDomainEvents()[0]?.tipo).toBe('OrdenDeProduccionCreada');
  });
});

// ── Tests: calcularBOM ─────────────────────────────────────────

describe('OrdenDeProduccion.calcularBOM', () => {
  it('adjunta el BOM y emite BOMCalculadoParaOrden', () => {
    const orden = conBOM();
    expect(orden.bom).toHaveLength(2);
    expect(orden.pullDomainEvents().at(-1)?.tipo).toBe('BOMCalculadoParaOrden');
  });

  it('rechaza BOM vacío', () => {
    const res = crearOrdenBase().calcularBOM([], ahora, crypto.randomUUID());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('PRODUCTION_BOM_VACIO');
  });

  it('rechaza si el BOM ya fue calculado (invariante 9)', () => {
    const res = conBOM().calcularBOM(bomBasico(), ahora, crypto.randomUUID());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('PRODUCTION_BOM_YA_CALCULADO');
  });

  it('rechaza lineaId duplicado (invariante 4)', () => {
    const lineaRep = lineaBOM(ingA, 3);
    const res = crearOrdenBase().calcularBOM([lineaRep, lineaRep], ahora, crypto.randomUUID());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('PRODUCTION_LINEA_BOM_DUPLICADA');
  });

  it('rechaza ingredientId duplicado (invariante 5)', () => {
    const res = crearOrdenBase().calcularBOM(
      [lineaBOM(ingA, 3), lineaBOM(ingA, 2)],
      ahora,
      crypto.randomUUID(),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('PRODUCTION_INGREDIENTE_DUPLICADO_EN_BOM');
  });

  it('rechaza si la orden no está en PLANIFICADA', () => {
    const res = reservada().calcularBOM(bomBasico(), ahora, crypto.randomUUID());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('PRODUCTION_TRANSICION_DE_ESTADO_INVALIDA');
  });
});

// ── Tests: reservarIngredientes ────────────────────────────────

describe('OrdenDeProduccion.reservarIngredientes', () => {
  it('pasa a RESERVADA y emite IngredientesReservadosParaOrden', () => {
    const orden = reservada();
    expect(orden.estado).toBe(EstadoDeOrdenDeProduccion.RESERVADA);
    expect(orden.pullDomainEvents().at(-1)?.tipo).toBe('IngredientesReservadosParaOrden');
  });

  it('rechaza si BOM no calculado', () => {
    const res = crearOrdenBase().reservarIngredientes(ahora, crypto.randomUUID());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('PRODUCTION_BOM_NO_CALCULADO');
  });
});

// ── Tests: iniciar ─────────────────────────────────────────────

describe('OrdenDeProduccion.iniciar', () => {
  it('pasa a EN_EJECUCION', () => {
    expect(enEjecucion().estado).toBe(EstadoDeOrdenDeProduccion.EN_EJECUCION);
  });

  it('rechaza si no está RESERVADA', () => {
    const res = crearOrdenBase().iniciar(usuarioId, ahora, crypto.randomUUID());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('PRODUCTION_TRANSICION_DE_ESTADO_INVALIDA');
  });
});

// ── Tests: registrarMerma ──────────────────────────────────────

describe('OrdenDeProduccion.registrarMerma', () => {
  function merma(ingredientId: IngredientIdRef, cantidadValor: number): RegistroDeMerma {
    return RegistroDeMerma.crear({
      id: RegistroDeMermaId.nuevo(),
      ingredientId,
      cantidad: cantidadKg(cantidadValor),
      motivo: 'Derrame accidental',
      registradaPor: usuarioId,
      registradaEn: ahora,
    });
  }

  it('registra merma válida y emite MermaDeProduccionRegistrada', () => {
    const res = enEjecucion().registrarMerma(merma(ingA, 1));
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.mermas).toHaveLength(1);
      expect(res.value.pullDomainEvents().at(-1)?.tipo).toBe('MermaDeProduccionRegistrada');
    }
  });

  it('rechaza si no está EN_EJECUCION', () => {
    const res = crearOrdenBase().registrarMerma(merma(ingA, 1));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('PRODUCTION_MERMA_FUERA_DE_EJECUCION');
  });

  it('rechaza merma > BOM del ingrediente (invariante 7)', () => {
    // BOM ingA = 5 kg → mermar 6 kg debe fallar
    const res = enEjecucion().registrarMerma(merma(ingA, 6));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('PRODUCTION_MERMA_EXCEDE_CONSUMO');
  });

  it('acumula mermas y verifica el límite combinado', () => {
    const conMerma1 = unwrap(enEjecucion().registrarMerma(merma(ingA, 3)));
    // 3 + 3 = 6 > 5 kg del BOM → debe rechazar
    const res = conMerma1.registrarMerma(merma(ingA, 3));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('PRODUCTION_MERMA_EXCEDE_CONSUMO');
  });
});

// ── Tests: ejecutar ────────────────────────────────────────────

describe('OrdenDeProduccion.ejecutar', () => {
  const loteCode = unwrap(CodigoDeLote.of('LOTE-20260514-0001'));

  it('produce lote y calcula consumo real (BOM - merma)', () => {
    const merma = RegistroDeMerma.crear({
      id: RegistroDeMermaId.nuevo(),
      ingredientId: ingA,
      cantidad: cantidadKg(1),
      motivo: 'Merma de prueba',
      registradaPor: usuarioId,
      registradaEn: ahora,
    });
    const ordenConMerma = unwrap(enEjecucion().registrarMerma(merma));
    const res = ordenConMerma.ejecutar(10, loteCode, usuarioId, ahora, crypto.randomUUID());
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.estado).toBe(EstadoDeOrdenDeProduccion.EJECUTADA);
      expect(res.value.lote).not.toBeNull();
      const evento = res.value.pullDomainEvents().at(-1);
      expect(evento?.tipo).toBe('OrdenDeProduccionEjecutada');
      type EjecutadaPayload = {
        payload: { consumoReal: Array<{ ingredientId: string; cantidadConsumida: number }> };
      };
      const consumoA = (
        evento as unknown as EjecutadaPayload | undefined
      )?.payload.consumoReal.find((c) => c.ingredientId === ingA.toString());
      // consumoReal ingA = 5 - 1 = 4
      expect(consumoA?.cantidadConsumida).toBe(4);
    }
  });

  it('rechaza cantidadProducida > cantidadAProducir (invariante 8)', () => {
    const res = enEjecucion().ejecutar(11, loteCode, usuarioId, ahora, crypto.randomUUID());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('PRODUCTION_CANTIDAD_PRODUCIDA_INVALIDA');
  });

  it('rechaza si no está EN_EJECUCION', () => {
    const res = crearOrdenBase().ejecutar(5, loteCode, usuarioId, ahora, crypto.randomUUID());
    expect(res.ok).toBe(false);
  });
});

// ── Tests: cancelar ────────────────────────────────────────────

describe('OrdenDeProduccion.cancelar', () => {
  it('cancela desde PLANIFICADA', () => {
    const res = crearOrdenBase().cancelar(
      'Error en la planificación',
      usuarioId,
      ahora,
      crypto.randomUUID(),
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.estado).toBe(EstadoDeOrdenDeProduccion.CANCELADA);
  });

  it('cancela desde RESERVADA', () => {
    const res = reservada().cancelar('Cambio de plan', usuarioId, ahora, crypto.randomUUID());
    expect(res.ok).toBe(true);
  });

  it('rechaza cancelar sin motivo', () => {
    const res = crearOrdenBase().cancelar('', usuarioId, ahora, crypto.randomUUID());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('PRODUCTION_CANCELACION_SIN_JUSTIFICACION');
  });

  it('rechaza cancelar en EN_EJECUCION', () => {
    const res = enEjecucion().cancelar('No se puede', usuarioId, ahora, crypto.randomUUID());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('PRODUCTION_ORDEN_NO_CANCELABLE');
  });
});
