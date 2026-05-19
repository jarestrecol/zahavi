# Glosario Ubicuo — Bounded Context: Catalog

> Este glosario fija el lenguaje ubicuo del BC **Catalog** para Zahavi.
> Todos los nombres aquí definidos deben usarse tal cual en el código, los
> tests y las conversaciones con el negocio. Los sinónimos descartados se
> listan explícitamente para evitar derivas de vocabulario.

---

## Tabla de términos

| Término | Definición |
|---|---|
| **Producto** | Ítem vendible u ofrecible del menú con un nombre y, opcionalmente, una receta. Aggregate principal del BC. Tiene identidad estable (`ProductId`), pertenece a exactamente una `Categoria` hoja, y agrupa una o más `Variante`s con su propio precio. Sinónimos descartados: "ítem", "SKU", "artículo del menú". |
| **Variante** | Presentación concreta de un `Producto` con su propio precio en COP (p.ej. "Mediano", "Grande", "Familiar"). Entidad anidada dentro de `Producto`. Tiene `ProductVariantId` único dentro del aggregate. Sinónimos descartados: "tamaño", "opción", "modificador". |
| **Categoría** | Clasificador jerárquico bajo el que se agrupan los productos en el menú. Una `Categoria` puede tener una `Categoria` padre. Un `Producto` pertenece a exactamente una `Categoria` **hoja** (sin subcategorías). Aggregate propio. Sinónimos descartados: "sección", "grupo del menú", "rubro". |
| **Combo** | Agrupación promocional de varias `Variante`s con un precio específico que normalmente es menor que la suma individual. Aggregate propio. Tiene nombre, descripción, una imagen opcional, y puede estar `activo` o `inactivo`. Sinónimos descartados: "promoción", "paquete", "menú del día". |
| **Item de Combo** | Línea de un `Combo`: una `Variante` con su `Cantidad`. Entidad anidada en el aggregate `Combo`. |
| **Receta** | Lista de ingredientes (con cantidades y unidades) necesaria para producir una unidad de un `Producto` terminado. Aggregate propio porque su ciclo de vida (versionado, actualización por planta central) es independiente del producto. Sinónimos descartados: "BOM" (en BC Production se mantiene "BOM"; en Catalog decimos **receta**), "fórmula", "preparación". |
| **Línea de Receta** | Entrada individual de la receta: `IngredientId` + `Cantidad` + `Unidad`. Entidad anidada en el aggregate `Receta`. |
| **Escandallo** | Cálculo del costo unitario de un `Producto` a partir del costo de cada ingrediente de su `Receta` y los empaques consumidos. **Es un cálculo, no un atributo persistido.** El dominio expone `Receta.calcularCosto(costos)` que recibe los costos del exterior (puerto). Sinónimos descartados: "costeo", "cost breakdown". |
| **Ingrediente (Catalog)** | Referencia opaca a un ingrediente cuyo aggregate vive en el BC **Inventory**. Catalog no conoce el nombre, ni la unidad nativa, ni el stock del ingrediente: solo guarda su `IngredientId`. Toda interpretación pasa por una capa anti-corrupción (ACL). |
| **Empaque** | Material consumible (bolsa, caja, papel, palillo, servilleta) usado al despachar un producto. **No tiene aggregate propio en Catalog**: se modela como un `Ingrediente` más dentro de la `Receta`. Decisión confirmada por Julian. Sinónimos descartados: "empaque" como entidad separada, "embalaje". |
| **Margen** | VO calculado y expuesto solo cuando se invoca `Producto.calcularMargen(receta, costos)`. Lleva `precioVenta`, `costoUnitario`, `montoMargen` y `porcentajeMargen`. **No se persiste**. La autorización (solo ADMIN/SUPERADMIN puede consultarlo) la aplica el caso de uso, no el dominio. El dominio lo expone como método explícito para que la capa de aplicación pueda decidir si llamarlo. |
| **Estado de Producto** | Enumerado: `borrador` (sin receta, no vendible) o `activo` (con receta y vendible). Sinónimos descartados: "DRAFT" (en código de dominio decimos `borrador`), "publicado". |
| **Estado de Combo** | Enumerado: `activo` o `inactivo`. Un combo `inactivo` no se puede vender. |
| **Estado de Categoría** | Enumerado: `activa` o `archivada`. Una `Categoria` archivada no admite nuevos productos. |
| **Categoría Hoja** | `Categoria` que no tiene subcategorías. Solo las hojas pueden contener `Producto`s. La invariante se valida en el caso de uso vía repositorio (la `Categoria` aislada no conoce sus hijas). |
| **Cantidad** | VO numérico positivo asociado a una `Unidad`. Inmutable, con operaciones puras (`mas`, `menos`, `multiplicarPor`). |
| **Unidad** | Enumerado de unidades de medida soportadas por la receta: `gramo`, `kilogramo`, `mililitro`, `litro`, `unidad`. Sinónimos descartados: "g", "kg", "ml", "L", "u" (no se usan; el código usa los nombres completos). |
| **Money (COP)** | VO monetario en pesos colombianos sin decimales. Inmutable. Operaciones: `mas`, `menos`, `multiplicarPor`. Constructor estático `Money.deCop(valor)` rechaza decimales y negativos. |
| **NombreDeCatalogo** | VO que envuelve el nombre de un `Producto`, `Combo` o `Categoria`. 2..120 caracteres, normalizado (espacios colapsados, sin caracteres de control). |

---

## Value Objects (índice)

| Término | Definición |
|---|---|
| **ProductId** | Identificador opaco e inmutable de un `Producto`. UUID v4. |
| **ProductVariantId** | Identificador opaco de una `Variante` dentro de un `Producto`. Único en el aggregate. |
| **CategoryId** | Identificador opaco de una `Categoria`. |
| **RecipeId** | Identificador opaco de una `Receta`. |
| **RecipeLineId** | Identificador opaco de una `LineaDeReceta` dentro de una `Receta`. |
| **ComboId** | Identificador opaco de un `Combo`. |
| **ComboItemId** | Identificador opaco de un `ItemDeCombo` dentro de un `Combo`. |
| **IngredientId** | **Referencia ACL** a un ingrediente del BC Inventory. UUID. Catalog no carga el aggregate Ingredient: solo lo identifica. |
| **Money** | Valor monetario en COP, entero ≥ 0. |
| **Cantidad** | Número decimal positivo (> 0) con `Unidad`. |
| **Unidad** | `gramo` \| `kilogramo` \| `mililitro` \| `litro` \| `unidad`. |
| **NombreDeCatalogo** | Nombre normalizado de 2..120 caracteres. |
| **Margen** | VO calculado: `{ precioVenta: Money, costoUnitario: Money, montoMargen: Money, porcentajeMargen: number }`. |

---

## Eventos en pasado (vocabulario)

Los nombres exactos viven en el archivo `events/index.ts`. El glosario solo
fija el verbo correcto en pasado para cada hecho del negocio:

- "Se creó un producto" → `ProductoCreado`
- "Se activó un producto" → `ProductoActivado`
- "Se desactivó un producto" → `ProductoDesactivado`
- "Se actualizó la receta" → `RecetaActualizada`
- "Se creó un combo" → `ComboCreado`
- "Se desactivó un combo" → `ComboDesactivado`
- "Se creó una categoría" → `CategoriaCreada`

---

## Reglas de oro del lenguaje

1. Nunca decimos "SKU" ni "item": decimos **producto**.
2. Nunca decimos "tamaño" cuando hablamos de una variante: decimos
   **variante**. "Tamaño" es solo el valor humano de uno de sus atributos.
3. Nunca decimos "DRAFT" en código: decimos `borrador`.
4. Los **empaques** son ingredientes en la receta, no entidades aparte.
5. El **margen y el costo unitario nunca se persisten en Catalog**: son
   cálculos. La capa de aplicación decide si materializarlos (autorización).
6. **Catalog no conoce stock**: nunca importa el aggregate `Ingrediente` del
   BC Inventory; solo conoce su `IngredientId`.
7. Una **receta** describe la composición teórica para producir 1 unidad. La
   merma, el lote y el rendimiento real son responsabilidad del BC Production.
8. Un **producto sin receta activa** está en estado `borrador`: no se puede
   vender hasta que tenga receta y se active explícitamente.
