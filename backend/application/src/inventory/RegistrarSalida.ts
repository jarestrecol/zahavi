import { type Result, ok, err, TipoMovimiento } from '@zahavi/domain-inventory';
import { FechaHora } from '@zahavi/domain-shared-kernel';
import { Money } from '@zahavi/domain-shared-kernel';
import {
  IngredientId,
  BusinessUnitId,
  StockMovementId,
  StockAlertId,
  StockAlert,
} from '@zahavi/domain-inventory';
import type { DomainError } from '@zahavi/domain-shared-kernel';
import type {
  IIngredientRepository,
  IStockItemRepository,
  IStockMovementRepository,
  IStockAlertRepository,
  IPublicadorDeDomainEventsInventory,
  StockMovementRecord,
} from '@zahavi/ports';

export interface RegistrarSalidaInput {
  ingredienteId: string;
  businessUnitId: string;
  cantidad: number;
  tipo: 'PRODUCTION_OUT' | 'SALE_OUT';
  referencia: string;
  correlacionId: string;
}

export interface RegistrarSalidaOutput {
  stockItemId: string;
  cantidadResultante: number;
  alertaAbierta: boolean;
}

class RegistrarSalidaError extends Error implements DomainError {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'RegistrarSalidaError';
  }
}

export class RegistrarSalida {
  constructor(
    private readonly ingredientRepo: IIngredientRepository,
    private readonly stockItemRepo: IStockItemRepository,
    private readonly stockMovementRepo: IStockMovementRepository,
    private readonly stockAlertRepo: IStockAlertRepository,
    private readonly publicador: IPublicadorDeDomainEventsInventory,
  ) {}

  async execute(input: RegistrarSalidaInput): Promise<Result<RegistrarSalidaOutput, DomainError>> {
    const ingIdResult = IngredientId.of(input.ingredienteId);
    if (!ingIdResult.ok) return err(ingIdResult.error);

    const bunitIdResult = BusinessUnitId.of(input.businessUnitId);
    if (!bunitIdResult.ok) return err(bunitIdResult.error);

    const ingrediente = await this.ingredientRepo.getById(ingIdResult.value);
    if (!ingrediente) {
      return err(
        new RegistrarSalidaError(
          `Ingrediente ${input.ingredienteId} no encontrado`,
          'INVENTORY_INGREDIENTE_NO_ENCONTRADO',
        ),
      );
    }

    const stockItem = await this.stockItemRepo.getByIngredientAndUnit(
      ingIdResult.value,
      bunitIdResult.value,
    );
    if (!stockItem) {
      return err(
        new RegistrarSalidaError(
          `StockItem no encontrado para ingrediente ${input.ingredienteId} en unidad ${input.businessUnitId}`,
          'INVENTORY_STOCK_ITEM_NO_ENCONTRADO',
        ),
      );
    }

    const ahora = FechaHora.ahora();
    const movimientoId = StockMovementId.nuevo();
    const eventoId = crypto.randomUUID();

    const tipoMovimiento =
      input.tipo === 'PRODUCTION_OUT'
        ? TipoMovimiento.PRODUCTION_OUT
        : TipoMovimiento.PRODUCTION_OUT; // SALE_OUT se trata como PRODUCTION_OUT a nivel de dominio

    const salidaResult = stockItem.registrarSalida(
      input.cantidad,
      tipoMovimiento,
      input.referencia,
      movimientoId,
      ahora,
      eventoId,
    );
    if (!salidaResult.ok) return err(salidaResult.error);

    const stockActualizado = salidaResult.value;

    const movRecord: StockMovementRecord = {
      id: movimientoId,
      ingredientId: ingIdResult.value,
      businessUnitId: bunitIdResult.value,
      tipo:
        input.tipo === 'PRODUCTION_OUT'
          ? TipoMovimiento.PRODUCTION_OUT
          : TipoMovimiento.PRODUCTION_OUT,
      cantidad: input.cantidad,
      unidad: ingrediente.unidadNativa,
      costoUnitario: Money.cero(),
      referencia: input.referencia,
      motivo: '',
      supplierId: null,
      ocurridoEn: ahora,
      registradoPor: input.correlacionId,
    };

    await this.stockItemRepo.update(stockActualizado, input.correlacionId);
    await this.stockMovementRepo.save(movRecord, input.correlacionId);

    // Verificar si se debe abrir una alerta de stock
    let alertaAbierta = false;
    if (stockActualizado.estaBajoUmbral(ingrediente.umbralDeAlerta)) {
      const alertaExistente = await this.stockAlertRepo.getOpenByIngredientAndUnit(
        ingIdResult.value,
        bunitIdResult.value,
      );
      if (!alertaExistente) {
        const alertaIdResult = StockAlertId.nuevo();
        const nuevaAlertaResult = StockAlert.abrir(
          {
            id: alertaIdResult,
            ingredientId: ingIdResult.value,
            businessUnitId: bunitIdResult.value,
            stockAlMomento: stockActualizado.cantidadDisponible,
            umbralAlMomento: ingrediente.umbralDeAlerta,
            unidad: ingrediente.unidadNativa,
            ahora,
          },
          crypto.randomUUID(),
        );
        if (nuevaAlertaResult.ok) {
          await this.stockAlertRepo.save(nuevaAlertaResult.value, input.correlacionId);
          await this.publicador.publicarLote(nuevaAlertaResult.value.pullDomainEvents());
          alertaAbierta = true;
        }
      }
    }

    await this.publicador.publicarLote(stockActualizado.pullDomainEvents());

    return ok({
      stockItemId: stockActualizado.id.toString(),
      cantidadResultante: stockActualizado.cantidadDisponible,
      alertaAbierta,
    });
  }
}
