# Mapa de Aggregates — Bounded Context: Catalog

> Modelo de dominio del BC Catalog. Cubre el menú de Zahavi: productos con
> variantes, categorías jerárquicas, recetas (incluyendo empaques modelados
> como ingredientes consumibles) y combos promocionales.

---

## Resumen

El BC Catalog contiene cuatro aggregates:

1. **Producto** — ítem vendible con sus variantes y categoría.
2. **Categoria** — clasificador jerárquico del menú.
3. **Receta** — composición teórica de un producto terminado.
4. **Combo** — agrupación promocional de variantes.

La consistencia entre aggregates es **eventual** y se coordina vía Domain
Events y casos de uso (no vía referencias directas).

`IngredientId` es una **referencia ACL opaca** al BC Inventory: Catalog nunca
importa el aggregate Ingrediente, solo guarda su id. Los costos para calcular
escandallo se piden al exterior vía `Receta.calcularCosto(costos)`.

---

## Diagrama textual

```
┌──────────────────────────┐         ┌──────────────────────────┐
│  Categoria  (aggregate)  │         │   Receta (aggregate)     │
│  - id: CategoryId        │         │   - id: RecipeId         │
│  - nombre                │         │   - productoId           │
│  - padreId? : CategoryId │         │   - lineas: LineaReceta+ │
│  - orden: number         │         │   - version              │
│  - estado                │         └────────────┬─────────────┘
└────────────┬─────────────┘                      │
             │ 1                                  │ 0..1 (vincula)
             │                                    ▼
             │ N           ┌──────────────────────────────────────┐
             └────────────►│      Producto  (aggregate root)      │
                           │  - id: ProductId                     │
                           │  - nombre: NombreDeCatalogo          │
                           │  - categoriaId: CategoryId           │
                           │  - recetaId?: RecipeId               │
                           │  - variantes: ProductVariant[1..N]   │
                           │  - estado: borrador | activo         │
                           └──────────────┬───────────────────────┘
                                          │  contiene
                                          ▼
                              ┌──────────────────────────┐
                              │  ProductVariant (entidad)│
                              │  - id: ProductVariantId  │
                              │  - nombre                │
                              │  - precio: Money (COP)   │
                              └──────────────────────────┘

                ┌──────────────────────────────────────┐
                │     Combo (aggregate root)           │
                │  - id: ComboId                       │
                │  - nombre, descripcion, imagenUrl?   │
                │  - precio: Money (COP)               │
                │  - items: ComboItem[1..N]            │
                │  - estado: activo | inactivo         │
                └──────────────┬───────────────────────┘
                               │ contiene
                               ▼
                  ┌──────────────────────────────────┐
                  │       ComboItem (entidad)        │
                  │  - id: ComboItemId               │
                  │  - productVariantId: ProductVar… │
                  │  - cantidad: Cantidad            │
                  └──────────────────────────────────┘

                            ┌──────────────────────────────────────┐
                            │     Receta — detalle interno         │
                            │  ┌────────────────────────────────┐  │
                            │  │ LineaDeReceta (entidad)        │  │
                            │  │  - id: RecipeLineId            │  │
                            │  │  - ingredientId: IngredientId  │  │
                            │  │  - cantidad: Cantidad          │  │
                            │  │  - unidad: Unidad              │  │
                            │  │  - esEmpaque: boolean          │  │
                            │  └────────────────────────────────┘  │
                            └──────────────────────────────────────┘

         (BC Inventory)                 (BC externo)
  ┌────────────────────────┐
  │ Ingrediente (aggregate)│  ◄── Catalog SOLO conoce IngredientId.
  │   ¡NO se importa!      │      Costos llegan vía puerto:
  └────────────────────────┘      Receta.calcularCosto(costos)
```

---

## Aggregate 1: Producto

### Aggregate Root
`Producto`

### Atributos
- `id: ProductId`
- `nombre: NombreDeCatalogo`
- `categoriaId: CategoryId`
- `imagenUrl: string | null` — URL para placeholder en tablet de mesero
- `variantes: ReadonlyArray<ProductVariant>` (1..N)
- `estado: EstadoDeProducto` (`borrador` | `activo`)
- `creadoEn: FechaHora`

### ProductVariant (entidad anidada) — cambio estructural iteración 2
Cada variante AHORA porta su propia receta:
- `id: ProductVariantId`
- `nombre: NombreDeCatalogo`
- `precio: Money` (COP, > 0)
- `recetaId: RecipeId | null` — **NUEVO**: cada variante puede tener 1 receta
  - `recetaId = null` → variante es "de reventa" (costo viene de último precio de compra en Inventory)
  - `recetaId != null` → variante es "elaborada" (costo se calcula de Recipe)

### Invariantes (numerados)

1. **Variantes ≥ 1**: un `Producto` no puede existir sin al menos una
   `ProductVariant`. Si la última variante se elimina, el comando falla con
   `ProductoSinVariantesError`.
2. **Precio de variante > 0**: `precio.toCop() > 0` para toda
   `ProductVariant`. La factoría `Money.deCop` ya rechaza negativos; la
   variante adicionalmente rechaza el cero (no se vende gratis).
3. **Variante con id único en el aggregate**: dos `ProductVariant` distintas
   no pueden compartir `ProductVariantId`.
4. **Activación sin exigencia de receta** (cambio iteración 2): para pasar de
   `borrador` a `activo`, el producto solo exige tener ≥1 variante. La receta
   por variante es opcional; el negocio decide qué variantes son elaboradas
   vs. de reventa. La bifurcación de escandallo ocurre en la capa de aplicación.
5. **Categoría hoja**: el producto solo puede pertenecer a una `Categoria`
   sin hijas. La validación se hace en el caso de uso (el aggregate
   `Producto` aislado no conoce el árbol de categorías).
6. **Nombre único dentro de la categoría**: la unicidad la garantiza el caso
   de uso vía repositorio. El aggregate guarda el nombre normalizado.

### Comandos aceptados
- `Producto.crear({ id, nombre, categoriaId, varianteInicial, ahora })` — crea en estado `borrador` con 1 variante.
- `vincularReceta(recetaId)`
- `agregarVariante(variante)` — falla si `id` ya existe.
- `eliminarVariante(varianteId)` — falla si dejaría 0 variantes.
- `cambiarPrecioDeVariante(varianteId, nuevoPrecio)`
- `cambiarNombre(nuevoNombre)`
- `cambiarCategoria(nuevaCategoriaId)` *(la validación de "hoja" la hace el caso de uso)*
- `activar(ahora)` — exige `recetaId !== null`.
- `desactivar(ahora, motivo)`
- `calcularMargen(receta, costos)` — cálculo puro, no muta. Devuelve `Margen` o error si la receta no corresponde.

### Eventos emitidos
- `ProductoCreado`
- `ProductoActivado`
- `ProductoDesactivado`
- `VarianteAgregadaAProducto`
- `VarianteEliminadaDeProducto`
- `PrecioDeVarianteCambiado`
- `RecetaVinculadaAProducto`
- `NombreDeProductoCambiado`
- `CategoriaDeProductoCambiada`

### Errores de dominio
- `ProductoSinVariantesError`
- `VarianteDuplicadaError`
- `VarianteNoEncontradaError`
- `PrecioInvalidoError`
- `ProductoSinRecetaError` *(al activar sin receta)*
- `ProductoYaEnEstadoError`

---

## Aggregate 2: Categoria

### Aggregate Root
`Categoria`

### Atributos
- `id: CategoryId`
- `nombre: NombreDeCatalogo`
- `padreId: CategoryId | null`
- `orden: number` (entero ≥ 0)
- `estado: EstadoDeCategoria` (`activa` | `archivada`)

### Invariantes

1. **Orden no negativo**: `orden >= 0`.
2. **Sin auto-referencia**: `padreId !== id`.
3. **Profundidad ≤ 3**: la profundidad del árbol se limita a 3 niveles. La
   verificación recursiva la hace el caso de uso vía repositorio (el
   aggregate solo conoce su propio padre directo).
4. **No archivar con productos activos**: archivar una categoría requiere
   que no haya `Producto`s activos asociados. El caso de uso lo verifica vía
   repositorio; el aggregate emite el comando solo si el caso de uso lo
   autoriza.
5. **No eliminar con productos activos**: idéntica regla. El caso de uso es
   el responsable.

### Comandos aceptados
- `Categoria.crear({ id, nombre, padreId, orden })`
- `cambiarNombre(nuevoNombre)`
- `cambiarOrden(nuevoOrden)`
- `cambiarPadre(nuevoPadreId | null)`
- `archivar(ahora)`
- `restaurar(ahora)`

### Eventos emitidos
- `CategoriaCreada`
- `NombreDeCategoriaCambiado`
- `OrdenDeCategoriaCambiado`
- `PadreDeCategoriaCambiado`
- `CategoriaArchivada`
- `CategoriaRestaurada`

### Errores de dominio
- `OrdenInvalidoError`
- `AutoReferenciaDeCategoriaError`
- `CategoriaConProductosActivosError` *(emitida por caso de uso)*
- `CategoriaYaEnEstadoError`

---

## Aggregate 3: Receta

### Aggregate Root
`Receta`

### Atributos
- `id: RecipeId`
- `productoId: ProductId`
- `lineas: ReadonlyArray<LineaDeReceta>` (1..N)
- `version: number` (entero ≥ 1, incrementa en cada actualización)
- `actualizadaEn: FechaHora`

### LineaDeReceta (entidad anidada)
- `id: RecipeLineId`
- `ingredientId: IngredientId`
- `cantidad: Cantidad`
- `unidad: Unidad`
- `esEmpaque: boolean`

### Invariantes

1. **Líneas ≥ 1**: una `Receta` debe tener al menos una `LineaDeReceta`.
2. **Línea con id único**: dos `LineaDeReceta` no pueden compartir
   `RecipeLineId` dentro de la misma `Receta`.
3. **Ingrediente único por línea**: un mismo `IngredientId` no puede aparecer
   en dos `LineaDeReceta` distintas. Si el negocio quiere "harina en dos
   pasos" se modela con dos ingredientes diferenciados o se suma en una sola
   línea.
4. **Cantidad > 0**: el VO `Cantidad` ya garantiza valor positivo.
5. **Unidad coherente con la línea**: la unidad declarada en la línea es la
   unidad consumida en la receta. La conversión a la unidad nativa del
   ingrediente es responsabilidad del adapter ACL hacia Inventory.
6. **Versión monotónica**: cada actualización incrementa `version` en 1.
7. **Costo unitario calculado**:
   `Receta.calcularCosto(costos: Map<IngredientId, Money>)` exige un costo
   por cada `IngredientId` presente en las líneas. Si falta alguno, devuelve
   `CostoIngredienteNoDisponibleError`. El cálculo es:

   ```
   Σ (costoUnitarioIngrediente × cantidadDeLaLinea)
   ```

   La unidad del costo del ingrediente debe ser compatible con la unidad de
   la línea: el adapter ACL es el que normaliza ambas a la misma base antes
   de invocar `calcularCosto` (Catalog asume que los costos llegan ya
   expresados por la unidad de cada línea).
8. **Costo > 0 si hay líneas con costo conocido**: si la `Receta` tiene
   líneas y todos los costos son `Money.deCop(0)`, el resultado es 0 — pero
   el método devuelve `CostoCeroSospechosoError` para advertir al caso de
   uso (que decidirá si lo permite o no).

### Comandos aceptados
- `Receta.crear({ id, productoId, lineas, ahora })`
- `agregarLinea(linea)`
- `eliminarLinea(lineaId)` — falla si dejaría 0 líneas.
- `actualizarLinea(lineaId, nuevaCantidad?, nuevaUnidad?)`
- `calcularCosto(costos: ReadonlyMap<IngredientId, Money>): Result<Money, ...>`
  *(consulta pura, no muta, no emite eventos)*

### Eventos emitidos
- `RecetaCreada`
- `RecetaActualizada` *(genérico — incluye add/remove/update de línea)*

### Errores de dominio
- `RecetaSinLineasError`
- `LineaDeRecetaDuplicadaError`
- `LineaDeRecetaNoEncontradaError`
- `IngredienteDuplicadoEnRecetaError`
- `CostoIngredienteNoDisponibleError`
- `CostoCeroSospechosoError`

---

## Aggregate 4: Combo

### Aggregate Root
`Combo`

### Atributos
- `id: ComboId`
- `nombre: NombreDeCatalogo`
- `descripcion: string` (vacío permitido)
- `imagenUrl: string | null`
- `precio: Money` (COP, ≥ 0; típicamente menor que la suma individual)
- `items: ReadonlyArray<ComboItem>` (1..N)
- `estado: EstadoDeCombo` (`activo` | `inactivo`)

### ComboItem (entidad anidada)
- `id: ComboItemId`
- `productVariantId: ProductVariantId`
- `cantidad: Cantidad`

### Invariantes

1. **Items ≥ 1**: un `Combo` debe tener al menos un `ComboItem`.
2. **Item con id único**: no se permiten dos `ComboItem` con el mismo
   `ComboItemId`.
3. **Variante única por item**: un `ProductVariantId` no puede aparecer dos
   veces en items distintos. Si el cliente quiere "2 cafés", se modela con
   `cantidad = 2` en un único item.
4. **Precio del combo ≥ 0**: el VO `Money` lo garantiza.
5. **Inactivo no se puede vender**: la verificación la hace el BC Sales al
   recibir el evento `ComboDesactivado` o al consultar el estado actual.
6. **Cantidad > 0 por item**: el VO `Cantidad` lo garantiza.

### Comandos aceptados
- `Combo.crear({ id, nombre, descripcion, imagenUrl, precio, items, ahora })`
- `agregarItem(item)`
- `eliminarItem(itemId)` — falla si dejaría 0 items.
- `cambiarPrecio(nuevoPrecio)`
- `cambiarNombre(nuevoNombre)`
- `cambiarDescripcion(nuevaDescripcion)`
- `cambiarImagen(nuevaImagenUrl | null)`
- `activar(ahora)`
- `desactivar(ahora)`

### Eventos emitidos
- `ComboCreado`
- `ComboDesactivado`
- `ComboActivado`
- `ItemAgregadoAlCombo`
- `ItemEliminadoDelCombo`
- `PrecioDeComboCambiado`

### Errores de dominio
- `ComboSinItemsError`
- `ItemDeComboDuplicadoError`
- `ItemDeComboNoEncontradoError`
- `VarianteDuplicadaEnComboError`
- `ComboYaEnEstadoError`

---

## Coordinación entre aggregates

| Operación | Caso de uso | Aggregates involucrados | Mecanismo |
|---|---|---|---|
| Crear producto en borrador | `CrearProducto` | `Producto` (escritura), `Categoria` (lectura para verificar hoja) | Verificación previa + transacción por aggregate |
| Vincular receta y activar | `ActivarProducto` | `Producto` (escritura), `Receta` (lectura) | Caso de uso lee receta del repo y exige `recetaId` antes de `activar()` |
| Calcular margen | `ConsultarMargenDeProducto` (solo ADMIN/SUPERADMIN) | `Producto` (lectura), `Receta` (lectura), Inventory (lectura de costos vía ACL) | El caso de uso compone: trae receta, pide costos por puerto, llama `Producto.calcularMargen` |
| Archivar categoría | `ArchivarCategoria` | `Categoria` (escritura) | El caso de uso valida vía repo que no hay productos activos antes |
| Desactivar combo | `DesactivarCombo` | `Combo` (escritura) | Emite `ComboDesactivado` que el BC Sales escucha para retirar de menús |
| Cambio de precio masivo | `ActualizarListaDePrecios` | `Producto` (escritura N) | El caso de uso itera; cada `Producto` emite `PrecioDeVarianteCambiado` |

---

## Decisiones tomadas

1. **Empaques como ingredientes** dentro de `Receta`, no aggregate separado:
   simplifica el modelo y unifica el costeo. El flag `esEmpaque` en
   `LineaDeReceta` permite reportes que distingan materia prima de empaque
   sin duplicar entidades.
2. **`Receta` aggregate propio**, no entidad anidada en `Producto`: la receta
   se versiona, se actualiza por la planta central, y un cambio de receta no
   debe forzar un evento de "producto modificado". Su ciclo de vida es
   independiente.
3. **`IngredientId` como referencia ACL opaca**: Catalog jamás importa el
   aggregate Ingrediente del BC Inventory. Esto preserva el límite del BC y
   permite evolucionar Inventory (cambiar nombres, fusionar SKUs) sin tocar
   Catalog.
4. **`Money.deCop` sin decimales**: la moneda colombiana se trabaja en
   pesos enteros. Multiplicaciones por `Cantidad` (que es decimal) se
   redondean a entero al final con `Math.round`. La política de redondeo
   queda fijada en el VO `Money`.
5. **`Margen` como cálculo, no atributo persistido**: el costo se mueve con
   compras a proveedores. Persistir margen sería desincronización. El
   dominio expone un método explícito `Producto.calcularMargen(receta, costos)`
   y la capa de aplicación decide quién puede invocarlo (autorización por
   rol).
6. **Estado de `Producto`: `borrador` | `activo`**: simplifica versus un
   `archivado` adicional. Si un producto se descontinúa, se desactiva (vuelve
   a `borrador`). El histórico queda en el log de auditoría.
7. **`ProductVariantId` único en el aggregate**, no globalmente: como las
   variantes nunca viven fuera de su `Producto`, no se requiere unicidad
   global. La FK desde `ComboItem` apunta al par
   `(ProductId, ProductVariantId)` o solo a `ProductVariantId` si se
   garantiza un esquema de UUIDs únicos en persistencia (decisión de
   adapter, no de dominio).
8. **`Receta.calcularCosto` recibe `Map<IngredientId, Money>` por
   parámetro**: respeta inversión de dependencias. Catalog no llama al BC
   Inventory; el caso de uso compone la llamada.
9. **Categoría jerárquica con profundidad ≤ 3**: límite operativo confirmado
   por Julian (panadería tiene "Bebidas > Calientes > Café", "Productos
   horneados > Pan > Salado" — tres niveles bastan). La validación de
   profundidad va en el caso de uso, no en el aggregate.

---

## Preguntas abiertas para Julian (no bloquean el scaffolding inicial pero
deben resolverse antes de producción)

1. **Promociones temporales (combos por fecha)**: el modelo actual no incluye
   `vigenciaDesde / vigenciaHasta` en `Combo`. ¿Se necesita o las
   promociones se manejan activando/desactivando manualmente?
2. **Variantes que comparten receta**: si "Café Mediano" y "Café Grande"
   tienen recetas diferentes (más leche en el grande), ¿se modelan como dos
   `Producto`s distintos o se asocia una `Receta` por `Variante`? El modelo
   actual asocia 1 `Receta` por `Producto`. **Recomendación**: si las
   recetas difieren, son productos distintos con la misma `Categoria`.
3. **Productos con receta opcional pero costo conocido** (p.ej. una soda
   Coca-Cola que se compra ya hecha): ¿se modelan con `Receta` de una sola
   línea (la botella como ingrediente) o con `recetaId = null` permanente y
   el costo viene de otro mecanismo? **Recomendación**: receta de una línea,
   uniforme.
4. **Política de redondeo de COP en cálculos de costo**: cuando una línea
   consume `0.350 kg` y el ingrediente cuesta `$ 8.450 / kg`, el resultado es
   `$ 2.957,5`. ¿Se redondea hacia arriba, hacia abajo o "banker's
   rounding"? Decisión actual en el código: `Math.round` (al más cercano).
5. **Imagen del producto**: el modelo actual no incluye `imagenUrl` en
   `Producto`, solo en `Combo`. ¿Se necesita?
