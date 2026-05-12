import { type Result, ok, err } from '@zahavi/domain-inventory';
import { FechaHora } from '@zahavi/domain-shared-kernel';
import { IngredientId, BusinessUnitId } from '@zahavi/domain-inventory';
import type { DomainError } from '@zahavi/domain-shared-kernel';
import type { IStockMovementRepository } from '@zahavi/ports';

export interface HistoricoMovimientosInput {
  ingredienteId?: string;
  businessUnitId: string;
  desde?: string; // ISO timestamp
  hasta?: string; // ISO timestamp
  actorRol: string;
  actorBusinessUnitId?: string;
}

export interface MovimientoResumen {
  id: string;
  ingredienteId: string;
  businessUnitId: string;
  tipo: string;
  cantidad: number;
  unidad: string;
  costoUnitario: number;
  referencia: string;
  motivo: string;
  supplierId: string | null;
  ocurridoEn: number;
  registradoPor: string;
}

export interface HistoricoMovimientosOutput {
  movimientos: MovimientoResumen[];
}

class HistoricoMovimientosError extends Error implements DomainError {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'HistoricoMovimientosError';
  }
}

export class HistoricoMovimientos {
  constructor(private readonly stockMovementRepo: IStockMovementRepository) {}

  async execute(
    input: HistoricoMovimientosInput,
  ): Promise<Result<HistoricoMovimientosOutput, DomainError>> {
    if (input.actorRol === 'WORKER') {
      return err(
        new HistoricoMovimientosError(
          'WORKER no tiene acceso al historial de movimientos',
          'INVENTORY_ROL_NO_AUTORIZADO',
        ),
      );
    }

    if (input.actorRol === 'ADMIN' && input.actorBusinessUnitId) {
      if (input.businessUnitId !== input.actorBusinessUnitId) {
        return err(
          new HistoricoMovimientosError(
            'ADMIN solo puede ver movimientos de su unidad',
            'INVENTORY_ACCESO_DENEGADO',
          ),
        );
      }
    }

    const bunitIdResult = BusinessUnitId.of(input.businessUnitId);
    if (!bunitIdResult.ok) return err(bunitIdResult.error);

    const desde = input.desde ? FechaHora.deTimestamp(Number(input.desde)) : undefined;
    const hasta = input.hasta ? FechaHora.deTimestamp(Number(input.hasta)) : undefined;

    let movimientos;

    if (input.ingredienteId) {
      const ingIdResult = IngredientId.of(input.ingredienteId);
      if (!ingIdResult.ok) return err(ingIdResult.error);
      movimientos = await this.stockMovementRepo.listByIngredient(ingIdResult.value, desde, hasta);
    } else {
      movimientos = await this.stockMovementRepo.listByBusinessUnit(
        bunitIdResult.value,
        desde,
        hasta,
      );
    }

    return ok({
      movimientos: movimientos.map((m) => ({
        id: m.id.toString(),
        ingredienteId: m.ingredientId.toString(),
        businessUnitId: m.businessUnitId.toString(),
        tipo: m.tipo,
        cantidad: m.cantidad,
        unidad: m.unidad,
        costoUnitario: m.costoUnitario.toCop(),
        referencia: m.referencia,
        motivo: m.motivo,
        supplierId: m.supplierId?.toString() ?? null,
        ocurridoEn: m.ocurridoEn.toTimestamp(),
        registradoPor: m.registradoPor,
      })),
    });
  }
}
