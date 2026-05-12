export type EstadoDeProducto = 'borrador' | 'activo';
export type EstadoDeCombo = 'activo' | 'inactivo';
export type EstadoDeCategoria = 'activa' | 'archivada';

export type Unidad = 'gramo' | 'kilogramo' | 'mililitro' | 'litro' | 'unidad';

export const UNIDADES_VALORES: readonly Unidad[] = [
  'gramo',
  'kilogramo',
  'mililitro',
  'litro',
  'unidad',
];

export function esUnidadValida(valor: string): valor is Unidad {
  return (UNIDADES_VALORES as readonly string[]).includes(valor);
}
