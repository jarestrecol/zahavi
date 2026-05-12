import { type Result, ok, err } from '@zahavi/domain-inventory';
import { FechaHora, Money } from '@zahavi/domain-shared-kernel';
import { Ingredient, IngredientId, UnidadNativa } from '@zahavi/domain-inventory';
import type { DomainError } from '@zahavi/domain-shared-kernel';
import type { IIngredientRepository, IPublicadorDeDomainEventsInventory } from '@zahavi/ports';

export interface CrearIngredienteInput {
  nombre: string;
  unidadNativa: string;
  costoUnitarioCop: number;
  umbralDeAlerta?: number;
  actorRol: string;
  correlacionId: string;
}

export interface CrearIngredienteOutput {
  ingredienteId: string;
}

class CrearIngredienteError extends Error implements DomainError {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'CrearIngredienteError';
  }
}

const UNIDADES_VALIDAS: Record<string, UnidadNativa> = {
  kg: UnidadNativa.KILOGRAMO,
  g: UnidadNativa.GRAMO,
  L: UnidadNativa.LITRO,
  mL: UnidadNativa.MILILITRO,
  unidad: UnidadNativa.UNIDAD,
};

export class CrearIngrediente {
  constructor(
    private readonly ingredientRepo: IIngredientRepository,
    private readonly publicador: IPublicadorDeDomainEventsInventory,
  ) {}

  async execute(
    input: CrearIngredienteInput,
  ): Promise<Result<CrearIngredienteOutput, DomainError>> {
    if (input.actorRol !== 'ADMIN' && input.actorRol !== 'SUPERADMIN') {
      return err(
        new CrearIngredienteError(
          'Solo ADMIN o SUPERADMIN pueden crear ingredientes',
          'INVENTORY_ROL_NO_AUTORIZADO',
        ),
      );
    }

    if (!input.nombre || input.nombre.trim().length === 0) {
      return err(
        new CrearIngredienteError(
          'El nombre del ingrediente es obligatorio',
          'INVENTORY_NOMBRE_REQUERIDO',
        ),
      );
    }

    const unidadNativa = UNIDADES_VALIDAS[input.unidadNativa];
    if (!unidadNativa) {
      return err(
        new CrearIngredienteError(
          `Unidad ${input.unidadNativa} no válida. Use: kg, g, L, mL, unidad`,
          'INVENTORY_UNIDAD_INVALIDA',
        ),
      );
    }

    const costoResult = Money.deCop(input.costoUnitarioCop);
    if (!costoResult.ok) return err(costoResult.error);

    const idResult = IngredientId.nuevo();
    const ahora = FechaHora.ahora();

    const createResult = Ingredient.crear(
      {
        id: idResult,
        nombre: input.nombre.trim(),
        unidadNativa,
        costoUnitarioActual: costoResult.value,
        umbralDeAlerta: input.umbralDeAlerta ?? 0,
        ahora,
      },
      crypto.randomUUID(),
    );
    if (!createResult.ok) return err(createResult.error);

    const ingrediente = createResult.value;

    await this.ingredientRepo.save(ingrediente, input.correlacionId);
    await this.publicador.publicarLote(ingrediente.pullDomainEvents());

    return ok({ ingredienteId: ingrediente.id.toString() });
  }
}
