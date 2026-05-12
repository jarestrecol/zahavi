import { type Result, ok, err } from '@zahavi/domain-inventory';
import { FechaHora } from '@zahavi/domain-shared-kernel';
import { IngredientId } from '@zahavi/domain-inventory';
import type { DomainError } from '@zahavi/domain-shared-kernel';
import type { IIngredientRepository, IPublicadorDeDomainEventsInventory } from '@zahavi/ports';

export interface ConfigurarAlertaIngredienteInput {
  ingredienteId: string;
  nuevoUmbral: number;
  actorRol: string;
  correlacionId: string;
}

export interface ConfigurarAlertaIngredienteOutput {
  ingredienteId: string;
  umbralAnterior: number;
  umbralNuevo: number;
}

class ConfigurarAlertaError extends Error implements DomainError {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'ConfigurarAlertaError';
  }
}

export class ConfigurarAlertaIngrediente {
  constructor(
    private readonly ingredientRepo: IIngredientRepository,
    private readonly publicador: IPublicadorDeDomainEventsInventory,
  ) {}

  async execute(
    input: ConfigurarAlertaIngredienteInput,
  ): Promise<Result<ConfigurarAlertaIngredienteOutput, DomainError>> {
    if (input.actorRol !== 'ADMIN' && input.actorRol !== 'SUPERADMIN') {
      return err(
        new ConfigurarAlertaError(
          'Solo ADMIN o SUPERADMIN pueden configurar alertas',
          'INVENTORY_ROL_NO_AUTORIZADO',
        ),
      );
    }

    const ingIdResult = IngredientId.of(input.ingredienteId);
    if (!ingIdResult.ok) return err(ingIdResult.error);

    const ingrediente = await this.ingredientRepo.getById(ingIdResult.value);
    if (!ingrediente) {
      return err(
        new ConfigurarAlertaError(
          `Ingrediente ${input.ingredienteId} no encontrado`,
          'INVENTORY_INGREDIENTE_NO_ENCONTRADO',
        ),
      );
    }

    const umbralAnterior = ingrediente.umbralDeAlerta;
    const ahora = FechaHora.ahora();

    const updateResult = ingrediente.cambiarUmbral(input.nuevoUmbral, ahora, crypto.randomUUID());
    if (!updateResult.ok) return err(updateResult.error);

    const actualizado = updateResult.value;

    await this.ingredientRepo.update(actualizado, input.correlacionId);
    await this.publicador.publicarLote(actualizado.pullDomainEvents());

    return ok({
      ingredienteId: actualizado.id.toString(),
      umbralAnterior,
      umbralNuevo: actualizado.umbralDeAlerta,
    });
  }
}
