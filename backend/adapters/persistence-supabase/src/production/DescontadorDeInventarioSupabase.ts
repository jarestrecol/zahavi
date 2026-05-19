import type { Kysely } from 'kysely';
import type { IDescontadorDeInventario, LineaDeConsumo } from '@zahavi/ports';
import type { InventoryDatabase } from '../inventory/schema.js';

/**
 * ACL adapter: descuenta el consumo real de producción directamente en las
 * tablas de Inventory. Opera en la misma transacción lógica que la ejecución
 * de la orden (mismo pool de conexiones compartido).
 *
 * Para cada ingrediente del consumoReal:
 *   1. Decrementa `inventory.stock_items.cantidad_disponible` (UPDATE atómico).
 *   2. Inserta un movimiento PRODUCTION_OUT en `inventory.stock_movements`.
 *
 * No dispara alertas de stock ni emite Domain Events del BC Inventory;
 * eso queda como trabajo futuro (D-032).
 */
export class DescontadorDeInventarioSupabase implements IDescontadorDeInventario {
  constructor(private readonly db: Kysely<InventoryDatabase>) {}

  async descontarConsumoDeProduccion(
    lineas: ReadonlyArray<LineaDeConsumo>,
    plantaCentralId: string,
    ordenId: string,
    correlacionId: string,
  ): Promise<void> {
    const ahora = new Date().toISOString();

    for (const linea of lineas) {
      // Decremento atómico — evita race condition de read-modify-write
      await this.db
        .updateTable('inventory.stock_items')
        .set((eb) => ({
          cantidad_disponible: eb('cantidad_disponible', '-', linea.cantidadConsumida),
          actualizado_en: ahora,
        }))
        .where('ingredient_id', '=', linea.ingredientId)
        .where('business_unit_id', '=', plantaCentralId)
        .execute();

      await this.db
        .insertInto('inventory.stock_movements')
        .values({
          id: crypto.randomUUID(),
          ingredient_id: linea.ingredientId,
          business_unit_id: plantaCentralId,
          tipo_movimiento: 'PRODUCTION_OUT',
          cantidad: linea.cantidadConsumida,
          unidad: linea.unidad,
          costo_unitario: 0,
          referencia: `ORDEN:${ordenId}`,
          motivo: 'Consumo de producción',
          supplier_id: null,
          ocurrido_en: ahora,
          registrado_por: correlacionId,
        })
        .execute();
    }
  }
}
