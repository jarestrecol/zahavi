import { type Result, ok, err, TipoMovimiento } from '@zahavi/domain-inventory';
import { FechaHora, Money } from '@zahavi/domain-shared-kernel';
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

export interface AjustarStockInput {
  ingredienteId: string;
  businessUnitId: string;
  cantidadNueva: number;
  motivo: string;
  actorRol: string;
  correlacionId: string;
}

export interface AjustarStockOutput {
  stockItemId: string;
  cantidadAnterior: number;
  cantidadNueva: number;
  alertaAbierta: boolean;
  alertaCerrada: boolean;
}

class AjustarStockError extends Error implements DomainError {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'AjustarStockError';
  }
}

export class AjustarStock {
  constructor(
    private readonly ingredientRepo: IIngredientRepository,
    private readonly stockItemRepo: IStockItemRepository,
    private readonly stockMovementRepo: IStockMovementRepository,
    private readonly stockAlertRepo: IStockAlertRepository,
    private readonly publicador: IPublicadorDeDomainEventsInventory,
  ) {}

  async execute(input: AjustarStockInput): Promise<Result<AjustarStockOutput, DomainError>> {
    if (input.actorRol !== 'ADMIN' && input.actorRol !== 'SUPERADMIN') {
      return err(
        new AjustarStockError(
          'Solo ADMIN o SUPERADMIN pueden ajustar stock',
          'INVENTORY_ROL_NO_AUTORIZADO',
        ),
      );
    }

    const ingIdResult = IngredientId.of(input.ingredienteId);
    if (!ingIdResult.ok) return err(ingIdResult.error);

    const bunitIdResult = BusinessUnitId.of(input.businessUnitId);
    if (!bunitIdResult.ok) return err(bunitIdResult.error);

    const ingrediente = await this.ingredientRepo.getById(ingIdResult.value);
    if (!ingrediente) {
      return err(
        new AjustarStockError(
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
        new AjustarStockError(`StockItem no encontrado`, 'INVENTORY_STOCK_ITEM_NO_ENCONTRADO'),
      );
    }

    const cantidadAnterior = stockItem.cantidadDisponible;
    const ahora = FechaHora.ahora();
    const movimientoId = StockMovementId.nuevo();

    const ajusteResult = stockItem.ajustar(
      input.cantidadNueva,
      input.motivo,
      movimientoId,
      ahora,
      crypto.randomUUID(),
    );
    if (!ajusteResult.ok) return err(ajusteResult.error);

    const stockActualizado = ajusteResult.value;

    const movRecord: StockMovementRecord = {
      id: movimientoId,
      ingredientId: ingIdResult.value,
      businessUnitId: bunitIdResult.value,
      tipo: TipoMovimiento.ADJUSTMENT,
      cantidad: input.cantidadNueva - cantidadAnterior,
      unidad: ingrediente.unidadNativa,
      costoUnitario: Money.cero(),
      referencia: '',
      motivo: input.motivo.trim(),
      supplierId: null,
      ocurridoEn: ahora,
      registradoPor: input.correlacionId,
    };

    await this.stockItemRepo.update(stockActualizado, input.correlacionId);
    await this.stockMovementRepo.save(movRecord, input.correlacionId);

    let alertaAbierta = false;
    let alertaCerrada = false;

    const alertaExistente = await this.stockAlertRepo.getOpenByIngredientAndUnit(
      ingIdResult.value,
      bunitIdResult.value,
    );

    if (stockActualizado.estaBajoUmbral(ingrediente.umbralDeAlerta)) {
      if (!alertaExistente) {
        const nuevaAlertaResult = StockAlert.abrir(
          {
            id: StockAlertId.nuevo(),
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
    } else if (alertaExistente) {
      const cierreResult = alertaExistente.cerrar(ahora, crypto.randomUUID());
      if (cierreResult.ok) {
        await this.stockAlertRepo.update(cierreResult.value, input.correlacionId);
        await this.publicador.publicarLote(cierreResult.value.pullDomainEvents());
        alertaCerrada = true;
      }
    }

    await this.publicador.publicarLote(stockActualizado.pullDomainEvents());

    return ok({
      stockItemId: stockActualizado.id.toString(),
      cantidadAnterior,
      cantidadNueva: stockActualizado.cantidadDisponible,
      alertaAbierta,
      alertaCerrada,
    });
  }
}
