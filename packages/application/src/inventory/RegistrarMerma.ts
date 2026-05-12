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

export interface RegistrarMermaInput {
  ingredienteId: string;
  businessUnitId: string;
  cantidad: number;
  motivo: string;
  actorRol: string;
  correlacionId: string;
}

export interface RegistrarMermaOutput {
  stockItemId: string;
  cantidadResultante: number;
  alertaAbierta: boolean;
}

class RegistrarMermaError extends Error implements DomainError {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'RegistrarMermaError';
  }
}

export class RegistrarMerma {
  constructor(
    private readonly ingredientRepo: IIngredientRepository,
    private readonly stockItemRepo: IStockItemRepository,
    private readonly stockMovementRepo: IStockMovementRepository,
    private readonly stockAlertRepo: IStockAlertRepository,
    private readonly publicador: IPublicadorDeDomainEventsInventory,
  ) {}

  async execute(input: RegistrarMermaInput): Promise<Result<RegistrarMermaOutput, DomainError>> {
    if (input.actorRol !== 'ADMIN' && input.actorRol !== 'SUPERADMIN') {
      return err(
        new RegistrarMermaError(
          'Solo ADMIN o SUPERADMIN pueden registrar mermas',
          'INVENTORY_ROL_NO_AUTORIZADO',
        ),
      );
    }

    if (!input.motivo || input.motivo.trim().length === 0) {
      return err(
        new RegistrarMermaError(
          'El motivo de la merma es obligatorio',
          'INVENTORY_MOTIVO_REQUERIDO',
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
        new RegistrarMermaError(
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
        new RegistrarMermaError(`StockItem no encontrado`, 'INVENTORY_STOCK_ITEM_NO_ENCONTRADO'),
      );
    }

    const ahora = FechaHora.ahora();
    const movimientoId = StockMovementId.nuevo();

    const salidaResult = stockItem.registrarSalida(
      input.cantidad,
      TipoMovimiento.WASTE,
      input.motivo.trim(),
      movimientoId,
      ahora,
      crypto.randomUUID(),
    );
    if (!salidaResult.ok) return err(salidaResult.error);

    const stockActualizado = salidaResult.value;

    const movRecord: StockMovementRecord = {
      id: movimientoId,
      ingredientId: ingIdResult.value,
      businessUnitId: bunitIdResult.value,
      tipo: TipoMovimiento.WASTE,
      cantidad: input.cantidad,
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
