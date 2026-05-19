import { describe, it, expect } from 'vitest';
import { CalcularBOMYReservar } from '../../production/CalcularBOMYReservar.js';
import {
  makeMockOrdenRepo,
  makeMockConsultorDeReceta,
  makeOrdenPlanificada,
  makeOrdenConBOM,
  UUID_ORDEN,
  UUID_CORRELACION,
  LINEAS_RECETA_DEFAULT,
} from './helpers.js';

function makeUseCase(orden = makeOrdenPlanificada(), lineas = LINEAS_RECETA_DEFAULT) {
  const repo = makeMockOrdenRepo(orden);
  const consultor = makeMockConsultorDeReceta(lineas);
  return { uc: new CalcularBOMYReservar(repo, consultor), repo, consultor };
}

describe('CalcularBOMYReservar', () => {
  it('calcula BOM y pasa a RESERVADA', async () => {
    const { uc } = makeUseCase();
    const result = await uc.execute({ ordenId: UUID_ORDEN }, UUID_CORRELACION);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.estado).toBe('RESERVADA');
    expect(result.value.lineasBOM).toBe(2);
  });

  it('escala cantidades por cantidadAProducir', async () => {
    const { uc } = makeUseCase(makeOrdenPlanificada(20));
    const result = await uc.execute({ ordenId: UUID_ORDEN }, UUID_CORRELACION);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.lineasBOM).toBe(2);
  });

  it('rechaza si la orden no existe', async () => {
    const repo = makeMockOrdenRepo(null);
    const consultor = makeMockConsultorDeReceta();
    const uc = new CalcularBOMYReservar(repo, consultor);
    const result = await uc.execute({ ordenId: UUID_ORDEN }, UUID_CORRELACION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PRODUCTION_ORDEN_NO_ENCONTRADA');
  });

  it('rechaza si la receta no tiene líneas', async () => {
    const { uc } = makeUseCase(makeOrdenPlanificada(), []);
    const result = await uc.execute({ ordenId: UUID_ORDEN }, UUID_CORRELACION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PRODUCTION_RECETA_SIN_LINEAS');
  });

  it('rechaza si el BOM ya fue calculado', async () => {
    const { uc } = makeUseCase(makeOrdenConBOM());
    const result = await uc.execute({ ordenId: UUID_ORDEN }, UUID_CORRELACION);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('PRODUCTION_BOM_YA_CALCULADO');
  });
});
