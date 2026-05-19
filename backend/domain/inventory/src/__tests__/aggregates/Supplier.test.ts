import { describe, it, expect } from 'vitest';
import { FechaHora } from '@zahavi/domain-shared-kernel';
import { Supplier } from '../../aggregates/Supplier.js';
import { SupplierId } from '../../value-objects/ids.js';
import { ProveedorYaInactivoError } from '../../errors/index.js';

const SUP_ID = '00000000-0000-0000-0000-000000000020';
const EVT = '00000000-0000-0000-0000-0000000000dd';
const AHORA = FechaHora.deTimestamp(1_700_000_000_000);
const LUEGO = FechaHora.deTimestamp(1_700_000_100_000);

function unwrap<T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!r.ok) throw new Error(`Esperaba ok, recibí: ${JSON.stringify(r.error)}`);
  return r.value;
}

const supplierId = () => unwrap(SupplierId.of(SUP_ID));

function crear(notas?: string): Supplier {
  return unwrap(
    Supplier.crear(
      {
        id: supplierId(),
        nombre: 'Molinos del Valle S.A.S.',
        contacto: '+57 311 555 0101',
        ...(notas !== undefined && { notas }),
        ahora: AHORA,
      },
      EVT,
    ),
  );
}

describe('Supplier.crear', () => {
  it('crea un proveedor activo', () => {
    const s = crear();
    expect(s.nombre).toBe('Molinos del Valle S.A.S.');
    expect(s.contacto).toBe('+57 311 555 0101');
    expect(s.estado).toBe('activo');
    expect(s.esActivo()).toBe(true);
    expect(s.notas).toBe('');
  });

  it('acepta notas opcionales', () => {
    const s = crear('paga a 30 días');
    expect(s.notas).toBe('paga a 30 días');
  });

  it('emite ProveedorCreado', () => {
    const eventos = crear().pullDomainEvents();
    expect(eventos).toHaveLength(1);
    expect(eventos[0]?.tipo).toBe('ProveedorCreado');
    if (eventos[0]?.tipo === 'ProveedorCreado') {
      expect(eventos[0].payload.supplierId).toBe(SUP_ID);
      expect(eventos[0].payload.nombre).toBe('Molinos del Valle S.A.S.');
    }
  });
});

describe('Supplier.desactivar', () => {
  it('desactiva un proveedor activo', () => {
    const s = unwrap(crear().desactivar(LUEGO, EVT));
    expect(s.estado).toBe('inactivo');
    expect(s.esActivo()).toBe(false);
    expect(s.pullDomainEvents().map((e) => e.tipo)).toContain('ProveedorDesactivado');
  });

  it('desactivar uno ya inactivo retorna ProveedorYaInactivoError', () => {
    const inactivo = unwrap(crear().desactivar(LUEGO, EVT));
    const r = inactivo.desactivar(LUEGO, EVT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeInstanceOf(ProveedorYaInactivoError);
  });

  it('no muta el agregado original', () => {
    const s = crear();
    s.desactivar(LUEGO, EVT);
    expect(s.estado).toBe('activo');
  });
});

describe('Supplier.actualizar', () => {
  it('actualiza el nombre conservando los demás campos', () => {
    const s = unwrap(crear().actualizar({ nombre: 'Molinos del Valle Ltda.' }, LUEGO, EVT));
    expect(s.nombre).toBe('Molinos del Valle Ltda.');
    expect(s.contacto).toBe('+57 311 555 0101');
  });

  it('actualiza varios campos a la vez', () => {
    const s = unwrap(
      crear().actualizar({ contacto: 'ventas@molinos.co', notas: 'nuevo contacto' }, LUEGO, EVT),
    );
    expect(s.contacto).toBe('ventas@molinos.co');
    expect(s.notas).toBe('nuevo contacto');
    expect(s.nombre).toBe('Molinos del Valle S.A.S.');
  });

  it('emite ProveedorActualizado con el estado resultante', () => {
    const s = unwrap(crear().actualizar({ nombre: 'Nuevo Nombre' }, LUEGO, EVT));
    const ev = s.pullDomainEvents().find((e) => e.tipo === 'ProveedorActualizado');
    expect(ev).toBeDefined();
    if (ev && ev.tipo === 'ProveedorActualizado') {
      expect(ev.payload.nombre).toBe('Nuevo Nombre');
      expect(ev.payload.contacto).toBe('+57 311 555 0101');
    }
  });
});

describe('Supplier.reconstituir', () => {
  it('reconstituye sin eventos', () => {
    const s = Supplier.reconstituir({
      id: supplierId(),
      nombre: 'X',
      contacto: 'y',
      notas: '',
      estado: 'inactivo',
      creadoEn: AHORA,
    });
    expect(s.pullDomainEvents()).toHaveLength(0);
    expect(s.estado).toBe('inactivo');
  });
});
