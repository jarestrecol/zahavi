import { vi } from 'vitest';
import {
  StockItem,
  Supplier,
  StockAlert,
  Ingredient,
  IngredientId,
  BusinessUnitId,
  StockItemId,
  SupplierId,
  StockAlertId,
  UnidadNativa,
} from '@zahavi/domain-inventory';
import { Money, FechaHora } from '@zahavi/domain-shared-kernel';
import type {
  IIngredientRepository,
  IStockItemRepository,
  IStockMovementRepository,
  IStockAlertRepository,
  ISupplierRepository,
  IPublicadorDeDomainEventsInventory,
} from '@zahavi/ports';

// ── UUIDs fijos ───────────────────────────────────────────────────

export const UUID_ING = '11111111-1111-1111-1111-111111111111';
export const UUID_BUNIT = '22222222-2222-2222-2222-222222222222';
export const UUID_BUNIT2 = '33333333-3333-3333-3333-333333333333';
export const UUID_STOCK_ITEM = '44444444-4444-4444-4444-444444444444';
export const UUID_SUPPLIER = '55555555-5555-5555-5555-555555555555';
export const UUID_ALERTA = '66666666-6666-6666-6666-666666666666';
export const UUID_CORRELACION = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

export const AHORA = FechaHora.deTimestamp(1_700_000_000_000);

// ── Factories ─────────────────────────────────────────────────────

function unwrap<T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!r.ok) throw new Error(`unwrap falló: ${JSON.stringify(r.error)}`);
  return r.value;
}

export function makeIngredient(opts: { umbral?: number; costo?: number } = {}): Ingredient {
  const id = unwrap(IngredientId.of(UUID_ING));
  const costo = unwrap(Money.deCop(opts.costo ?? 3_500));
  return unwrap(
    Ingredient.crear(
      {
        id,
        nombre: 'Harina de trigo',
        unidadNativa: UnidadNativa.KILOGRAMO,
        costoUnitarioActual: costo,
        umbralDeAlerta: opts.umbral ?? 5,
        ahora: AHORA,
      },
      crypto.randomUUID(),
    ),
  );
}

export function makeStockItem(opts: { cantidad?: number; costo?: number } = {}): StockItem {
  const id = unwrap(StockItemId.of(UUID_STOCK_ITEM));
  const ingId = unwrap(IngredientId.of(UUID_ING));
  const bunitId = unwrap(BusinessUnitId.of(UUID_BUNIT));
  const costo = unwrap(Money.deCop(opts.costo ?? 3_500));

  return StockItem.reconstituir({
    id,
    ingredientId: ingId,
    businessUnitId: bunitId,
    cantidadDisponible: opts.cantidad ?? 20,
    unidadNativa: UnidadNativa.KILOGRAMO,
    costoPromedioUnitario: costo,
    version: 1,
    actualizadoEn: AHORA,
  });
}

export function makeSupplier(opts: { activo?: boolean } = {}): Supplier {
  const id = unwrap(SupplierId.of(UUID_SUPPLIER));
  const proveedor = unwrap(
    Supplier.crear(
      {
        id,
        nombre: 'Harinera del Valle',
        contacto: '310-000-0000',
        ahora: AHORA,
      },
      crypto.randomUUID(),
    ),
  );
  if (opts.activo === false) {
    return unwrap(proveedor.desactivar(AHORA, crypto.randomUUID()));
  }
  return proveedor;
}

export function makeAlertaAbierta(): StockAlert {
  const id = unwrap(StockAlertId.of(UUID_ALERTA));
  const ingId = unwrap(IngredientId.of(UUID_ING));
  const bunitId = unwrap(BusinessUnitId.of(UUID_BUNIT));
  return unwrap(
    StockAlert.abrir(
      {
        id,
        ingredientId: ingId,
        businessUnitId: bunitId,
        stockAlMomento: 3,
        umbralAlMomento: 5,
        unidad: UnidadNativa.KILOGRAMO,
        ahora: AHORA,
      },
      crypto.randomUUID(),
    ),
  );
}

// ── Mocks de repositorios ─────────────────────────────────────────

export function makeMockIngredientRepo(
  overrides: Partial<IIngredientRepository> = {},
): IIngredientRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    getById: vi.fn().mockResolvedValue(null),
    list: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

export function makeMockStockItemRepo(
  overrides: Partial<IStockItemRepository> = {},
): IStockItemRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    getById: vi.fn().mockResolvedValue(null),
    getByIngredientAndUnit: vi.fn().mockResolvedValue(null),
    listByBusinessUnit: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

export function makeMockStockMovementRepo(
  overrides: Partial<IStockMovementRepository> = {},
): IStockMovementRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    getById: vi.fn().mockResolvedValue(null),
    listByIngredient: vi.fn().mockResolvedValue([]),
    listByBusinessUnit: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

export function makeMockStockAlertRepo(
  overrides: Partial<IStockAlertRepository> = {},
): IStockAlertRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    getById: vi.fn().mockResolvedValue(null),
    getOpenByIngredientAndUnit: vi.fn().mockResolvedValue(null),
    listByBusinessUnit: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

export function makeMockSupplierRepo(
  overrides: Partial<ISupplierRepository> = {},
): ISupplierRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    getById: vi.fn().mockResolvedValue(null),
    list: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

export function makeMockPublicador(
  overrides: Partial<IPublicadorDeDomainEventsInventory> = {},
): IPublicadorDeDomainEventsInventory {
  return {
    publicar: vi.fn().mockResolvedValue(undefined),
    publicarLote: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}
