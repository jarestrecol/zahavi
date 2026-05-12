import { type Result, ok, err } from '@zahavi/domain-inventory';
import { FechaHora } from '@zahavi/domain-shared-kernel';
import { Supplier, SupplierId } from '@zahavi/domain-inventory';
import type { DomainError } from '@zahavi/domain-shared-kernel';
import type { ISupplierRepository, IPublicadorDeDomainEventsInventory } from '@zahavi/ports';

export interface CrearProveedorInput {
  nombre: string;
  contacto: string;
  notas?: string;
  actorRol: string;
  correlacionId: string;
}

export interface CrearProveedorOutput {
  proveedorId: string;
}

class CrearProveedorError extends Error implements DomainError {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'CrearProveedorError';
  }
}

export class CrearProveedor {
  constructor(
    private readonly supplierRepo: ISupplierRepository,
    private readonly publicador: IPublicadorDeDomainEventsInventory,
  ) {}

  async execute(input: CrearProveedorInput): Promise<Result<CrearProveedorOutput, DomainError>> {
    if (input.actorRol !== 'ADMIN' && input.actorRol !== 'SUPERADMIN') {
      return err(
        new CrearProveedorError(
          'Solo ADMIN o SUPERADMIN pueden crear proveedores',
          'INVENTORY_ROL_NO_AUTORIZADO',
        ),
      );
    }

    if (!input.nombre || input.nombre.trim().length === 0) {
      return err(
        new CrearProveedorError(
          'El nombre del proveedor es obligatorio',
          'INVENTORY_NOMBRE_REQUERIDO',
        ),
      );
    }

    if (!input.contacto || input.contacto.trim().length === 0) {
      return err(
        new CrearProveedorError(
          'El contacto del proveedor es obligatorio',
          'INVENTORY_CONTACTO_REQUERIDO',
        ),
      );
    }

    const idResult = SupplierId.nuevo();
    const ahora = FechaHora.ahora();

    const createResult = Supplier.crear(
      {
        id: idResult,
        nombre: input.nombre.trim(),
        contacto: input.contacto.trim(),
        notas: input.notas?.trim() ?? '',
        ahora,
      },
      crypto.randomUUID(),
    );
    if (!createResult.ok) return err(createResult.error);

    const proveedor = createResult.value;

    await this.supplierRepo.save(proveedor, input.correlacionId);
    await this.publicador.publicarLote(proveedor.pullDomainEvents());

    return ok({ proveedorId: proveedor.id.toString() });
  }
}
