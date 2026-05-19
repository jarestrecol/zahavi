import { type Result, ok, err } from '@zahavi/domain-inventory';
import { BusinessUnitId } from '@zahavi/domain-inventory';
import type { DomainError } from '@zahavi/domain-shared-kernel';
import type { IStockItemRepository } from '@zahavi/ports';

export interface ListarStockActualInput {
  businessUnitId: string;
  actorRol: string;
  actorBusinessUnitId?: string;
}

export interface StockItemResumen {
  stockItemId: string;
  ingredienteId: string;
  businessUnitId: string;
  cantidadDisponible: number;
  unidadNativa: string;
  costoPromedioUnitario: number;
  version: number;
}

export interface ListarStockActualOutput {
  items: StockItemResumen[];
}

class ListarStockActualError extends Error implements DomainError {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'ListarStockActualError';
  }
}

export class ListarStockActual {
  constructor(private readonly stockItemRepo: IStockItemRepository) {}

  async execute(
    input: ListarStockActualInput,
  ): Promise<Result<ListarStockActualOutput, DomainError>> {
    // WORKER no tiene acceso a inventario
    if (input.actorRol === 'WORKER') {
      return err(
        new ListarStockActualError(
          'WORKER no tiene acceso a inventario',
          'INVENTORY_ROL_NO_AUTORIZADO',
        ),
      );
    }

    // ADMIN solo puede ver su propia unidad de negocio
    if (input.actorRol === 'ADMIN' && input.actorBusinessUnitId) {
      if (input.businessUnitId !== input.actorBusinessUnitId) {
        return err(
          new ListarStockActualError(
            'ADMIN solo puede ver el inventario de su unidad de negocio',
            'INVENTORY_ACCESO_DENEGADO',
          ),
        );
      }
    }

    const bunitIdResult = BusinessUnitId.of(input.businessUnitId);
    if (!bunitIdResult.ok) return err(bunitIdResult.error);

    const items = await this.stockItemRepo.listByBusinessUnit(bunitIdResult.value);

    return ok({
      items: items.map((item) => ({
        stockItemId: item.id.toString(),
        ingredienteId: item.ingredientId.toString(),
        businessUnitId: item.businessUnitId.toString(),
        cantidadDisponible: item.cantidadDisponible,
        unidadNativa: item.unidadNativa,
        costoPromedioUnitario: item.costoPromedioUnitario.toCop(),
        version: item.version,
      })),
    });
  }
}
