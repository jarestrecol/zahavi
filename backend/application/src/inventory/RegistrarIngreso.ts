import { type Result, ok, err } from '@zahavi/domain-inventory';
import { Money, FechaHora } from '@zahavi/domain-shared-kernel';
import {
  StockItem,
  IngredientId,
  BusinessUnitId,
  StockItemId,
  StockMovementId,
  SupplierId,
  TipoMovimiento,
} from '@zahavi/domain-inventory';
import type { DomainError } from '@zahavi/domain-shared-kernel';
import type {
  IIngredientRepository,
  IStockItemRepository,
  IStockMovementRepository,
  IStockAlertRepository,
  ISupplierRepository,
  IPublicadorDeDomainEventsInventory,
  StockMovementRecord,
} from '@zahavi/ports';

export interface RegistrarIngresoInput {
  ingredienteId: string;
  businessUnitId: string;
  cantidad: number;
  costoUnitarioCop: number;
  supplierId: string;
  referencia?: string;
  correlacionId: string;
}

export interface RegistrarIngresoOutput {
  stockItemId: string;
  cantidadResultante: number;
  costoPromedioNuevo: number;
  alertaCerrada: boolean;
}

class RegistrarIngresoError extends Error implements DomainError {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'RegistrarIngresoError';
  }
}

export class RegistrarIngreso {
  constructor(
    private readonly ingredientRepo: IIngredientRepository,
    private readonly stockItemRepo: IStockItemRepository,
    private readonly stockMovementRepo: IStockMovementRepository,
    private readonly stockAlertRepo: IStockAlertRepository,
    private readonly supplierRepo: ISupplierRepository,
    private readonly publicador: IPublicadorDeDomainEventsInventory,
  ) {}

  async execute(
    input: RegistrarIngresoInput,
  ): Promise<Result<RegistrarIngresoOutput, DomainError>> {
    const ingIdResult = IngredientId.of(input.ingredienteId);
    if (!ingIdResult.ok) return err(ingIdResult.error);

    const bunitIdResult = BusinessUnitId.of(input.businessUnitId);
    if (!bunitIdResult.ok) return err(bunitIdResult.error);

    const supplierIdResult = SupplierId.of(input.supplierId);
    if (!supplierIdResult.ok) return err(supplierIdResult.error);

    const costoResult = Money.deCop(input.costoUnitarioCop);
    if (!costoResult.ok) return err(costoResult.error);

    const ingrediente = await this.ingredientRepo.getById(ingIdResult.value);
    if (!ingrediente) {
      return err(
        new RegistrarIngresoError(
          `Ingrediente ${input.ingredienteId} no encontrado`,
          'INVENTORY_INGREDIENTE_NO_ENCONTRADO',
        ),
      );
    }

    const proveedor = await this.supplierRepo.getById(supplierIdResult.value);
    if (!proveedor) {
      return err(
        new RegistrarIngresoError(
          `Proveedor ${input.supplierId} no encontrado`,
          'INVENTORY_PROVEEDOR_NO_ENCONTRADO',
        ),
      );
    }
    if (proveedor.estado !== 'activo') {
      return err(
        new RegistrarIngresoError(
          `Proveedor ${input.supplierId} está inactivo`,
          'INVENTORY_PROVEEDOR_INACTIVO',
        ),
      );
    }

    const ahora = FechaHora.ahora();
    const movimientoId = StockMovementId.nuevo();
    const eventoId = crypto.randomUUID();

    let stockItem = await this.stockItemRepo.getByIngredientAndUnit(
      ingIdResult.value,
      bunitIdResult.value,
    );
    let esNuevo = false;

    if (!stockItem) {
      const stockIdResult = StockItemId.nuevo();
      const createResult = StockItem.crear(
        {
          id: stockIdResult,
          ingredientId: ingIdResult.value,
          businessUnitId: bunitIdResult.value,
          unidadNativa: ingrediente.unidadNativa,
          ahora,
        },
        crypto.randomUUID(),
      );
      if (!createResult.ok) return err(createResult.error);
      stockItem = createResult.value;
      esNuevo = true;
    }

    const ingresoResult = stockItem.registrarIngreso(
      input.cantidad,
      costoResult.value,
      movimientoId,
      supplierIdResult.value,
      ahora,
      eventoId,
    );
    if (!ingresoResult.ok) return err(ingresoResult.error);

    const stockActualizado = ingresoResult.value;

    const movRecord: StockMovementRecord = {
      id: movimientoId,
      ingredientId: ingIdResult.value,
      businessUnitId: bunitIdResult.value,
      tipo: TipoMovimiento.PURCHASE_IN,
      cantidad: input.cantidad,
      unidad: ingrediente.unidadNativa,
      costoUnitario: costoResult.value,
      referencia: input.referencia ?? '',
      motivo: '',
      supplierId: supplierIdResult.value,
      ocurridoEn: ahora,
      registradoPor: input.correlacionId,
    };

    if (esNuevo) {
      await this.stockItemRepo.save(stockActualizado, input.correlacionId);
    } else {
      await this.stockItemRepo.update(stockActualizado, input.correlacionId);
    }
    await this.stockMovementRepo.save(movRecord, input.correlacionId);

    // Cerrar alerta abierta si el stock ya supera el umbral
    let alertaCerrada = false;
    if (!stockActualizado.estaBajoUmbral(ingrediente.umbralDeAlerta)) {
      const alertaAbierta = await this.stockAlertRepo.getOpenByIngredientAndUnit(
        ingIdResult.value,
        bunitIdResult.value,
      );
      if (alertaAbierta) {
        const cierreResult = alertaAbierta.cerrar(ahora, crypto.randomUUID());
        if (cierreResult.ok) {
          await this.stockAlertRepo.update(cierreResult.value, input.correlacionId);
          await this.publicador.publicarLote(cierreResult.value.pullDomainEvents());
          alertaCerrada = true;
        }
      }
    }

    await this.publicador.publicarLote(stockActualizado.pullDomainEvents());

    return ok({
      stockItemId: stockActualizado.id.toString(),
      cantidadResultante: stockActualizado.cantidadDisponible,
      costoPromedioNuevo: stockActualizado.costoPromedioUnitario.toCop(),
      alertaCerrada,
    });
  }
}
