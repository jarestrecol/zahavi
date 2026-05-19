import {
  type Result,
  ok,
  err,
  NombreDeCatalogo,
  ComboId,
  ComboItemId,
  ProductVariantId,
  Money,
  Cantidad,
  Combo,
  ComboItem,
  FechaHora,
  esUnidadValida,
  type NombreDeCatalogoInvalidoError,
  type IdInvalidoError,
  type CantidadInvalidaError,
  type MoneyInvalidoError,
  type ComboSinItemsError,
  type ItemDeComboDuplicadoError,
  type VarianteDuplicadaEnComboError,
  type VigenciaInvalidaError,
  RolNoAutorizadoCatalogError,
} from '@zahavi/domain-catalog';
import type { IComboRepository, IPublicadorDeDomainEventsCatalog } from '@zahavi/ports';

export interface EntradaCrearCombo {
  nombre: string;
  descripcion: string;
  imagenUrl: string | null;
  precioCop: number;
  items: Array<{
    productoVarianteId: string;
    cantidadValor: number;
    unidad: string;
  }>;
  actorRol: string;
  correlacionId: string;
}

export interface SalidaCrearCombo {
  comboId: string;
  cantidadDeItems: number;
}

type ErrorCrearCombo =
  | RolNoAutorizadoCatalogError
  | NombreDeCatalogoInvalidoError
  | IdInvalidoError
  | CantidadInvalidaError
  | MoneyInvalidoError
  | ComboSinItemsError
  | ItemDeComboDuplicadoError
  | VarianteDuplicadaEnComboError
  | VigenciaInvalidaError;

export class CrearCombo {
  constructor(
    private readonly comboRepo: IComboRepository,
    private readonly publicador: IPublicadorDeDomainEventsCatalog,
  ) {}

  async execute(entrada: EntradaCrearCombo): Promise<Result<SalidaCrearCombo, ErrorCrearCombo>> {
    if (entrada.actorRol !== 'ADMIN' && entrada.actorRol !== 'SUPERADMIN') {
      return err(new RolNoAutorizadoCatalogError(entrada.actorRol, 'CrearCombo'));
    }

    const nombreRes = NombreDeCatalogo.of(entrada.nombre);
    if (!nombreRes.ok) return nombreRes;
    const nombre = nombreRes.value;

    const precioRes = Money.deCop(entrada.precioCop);
    if (!precioRes.ok) return precioRes;

    const items: ComboItem[] = [];
    for (const itemEntrada of entrada.items) {
      const itemIdRes = ComboItemId.of(crypto.randomUUID());
      if (!itemIdRes.ok) return itemIdRes;

      const varIdRes = ProductVariantId.of(itemEntrada.productoVarianteId);
      if (!varIdRes.ok) return varIdRes;

      if (!esUnidadValida(itemEntrada.unidad)) {
        return err(new RolNoAutorizadoCatalogError(itemEntrada.unidad, 'unidad inválida'));
      }

      const cantRes = Cantidad.de(itemEntrada.cantidadValor, itemEntrada.unidad);
      if (!cantRes.ok) return cantRes;

      items.push(
        ComboItem.crear({
          id: itemIdRes.value,
          productVariantId: varIdRes.value,
          cantidad: cantRes.value,
        }),
      );
    }

    const comboId = ComboId.of(crypto.randomUUID());
    if (!comboId.ok) return comboId;

    const ahora = FechaHora.deTimestamp(Date.now());
    const eventoId = crypto.randomUUID();

    const comboRes = Combo.crear(
      {
        id: comboId.value,
        nombre,
        descripcion: entrada.descripcion,
        imagenUrl: entrada.imagenUrl,
        precio: precioRes.value,
        items,
        vigenciaDesde: null,
        vigenciaHasta: null,
        ahora,
      },
      eventoId,
    );
    if (!comboRes.ok) return comboRes;
    const combo = comboRes.value;

    await this.comboRepo.save(combo, entrada.correlacionId);

    const eventos = combo.pullDomainEvents();
    for (const evento of eventos) {
      await this.publicador.publicar(evento, entrada.correlacionId);
    }

    return ok({
      comboId: comboId.value.toString(),
      cantidadDeItems: items.length,
    });
  }
}
