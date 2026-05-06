# PROMPTS POR ITERACIÓN — Zahavi POS

Cada bloque es un prompt **autocontenido** que pegas a Claude Code en una sesión limpia. Espera a que la iteración previa esté completa, verde y commiteada antes de pasar a la siguiente.

> **Recordatorio de tokens:** sesiones cortas y enfocadas. Cierra `claude` y vuelve a abrir entre iteraciones para liberar contexto.

---

## ITERACIÓN 0 — Bootstrap del monorepo

```
Lee CLAUDE.md y BOOTSTRAP.md. Ejecuta el bootstrap completo del monorepo Zahavi siguiendo BOOTSTRAP.md paso a paso, etapa por etapa.

Reglas:
- Detente al final de cada etapa y muéstrame qué creaste.
- No avances a la siguiente etapa sin mi confirmación.
- Si algo del BOOTSTRAP.md es ambiguo en el contexto real (Node version local, Docker disponible, etc.), pregúntame antes de inventar.
- Al final de la Etapa 7, invoca al architect-guardian para validar que la estructura está correcta y al doc-writer para crear el ADR-0001.

Empezamos por la Etapa 0.
```

---

## ITERACIÓN 1 — Identity (autenticación, roles, sesiones)

```
Lee CLAUDE.md y los subagentes en .claude/agents/. Vamos a implementar el bounded context Identity.

Plan:
1. Invoca a domain-modeler con: "modela el bounded context identity de Zahavi. Tres roles: SUPERADMIN, ADMIN, WORKER. Aggregates esperados: User, Role, Session. Considera que un User puede estar asignado a una o varias business_units. 2FA obligatorio para SUPERADMIN. Lenguaje ubicuo en español."

2. Espera el resultado del modelado y muéstrame el glosario y aggregates antes de generar código.

3. Una vez aprobado el modelado, genera el scaffolding en packages/domain/identity/ y los tests TDD de invariantes.

4. Crea el adapter packages/adapters/persistence-supabase/identity/ que implemente los puertos contra Supabase Auth + tablas custom (user_business_units, user_roles).

5. Crea las migraciones SQL correspondientes en db/migrations/up/ con RLS estricto. Pasa por db-reviewer.

6. Crea los casos de uso esenciales en packages/application/identity/:
   - RegistrarUsuario (solo invocable por SUPERADMIN)
   - AsignarRol
   - IniciarSesion
   - HabilitarDosFactor (obligatorio para SUPERADMIN)
   - RevocarSesion

7. Crea endpoints HTTP mínimos en apps/api/ para los casos de uso anteriores. Pasa por security-auditor.

8. Tests E2E con Playwright para el flujo: SUPERADMIN crea ADMIN → ADMIN crea WORKER → WORKER inicia sesión y NO ve endpoints administrativos.

9. Cadena final: /verify-architecture → /security-scan → /pre-commit.

Detente al final de cada paso para mi aprobación.
```

---

## ITERACIÓN 2 — Catalog (productos, recetas, escandallo)

```
Lee CLAUDE.md. Trabajamos sobre el bounded context Catalog. Asume que Identity ya está mergeado.

Plan:
1. Domain-modeler: "modela Catalog. Aggregates: Product (con variantes y precio en COP), Combo, Category, Recipe. Una Recipe vincula un Product terminado a una lista de (IngredientId, Quantity, Unit). Incluir empaques como ingredientes consumibles. Calcular costo unitario del producto = Σ(costo_ingrediente × cantidad) + costo_empaque. Calcular margen y rentabilidad (precio_venta − costo). El acceso a margen/rentabilidad solo es para ADMIN/SUPERADMIN."

2. Tras aprobación del modelado, scaffolding en packages/domain/catalog/.

3. Tests TDD de invariantes (precio ≥ 0, receta no vacía, costo coherente).

4. Migraciones SQL: products, product_variants, categories, combos, combo_items, recipes, recipe_items. RLS estricto: WORKER ve productos y precios pero NO costos ni márgenes.

5. Casos de uso:
   - CrearProducto / EditarProducto / ArchivarProducto
   - CrearReceta / EditarReceta
   - CrearCombo
   - CalcularEscandallo (solo ADMIN/SUPERADMIN)
   - CalcularRentabilidad (solo ADMIN/SUPERADMIN)

6. CLI admin: comandos zahavi catalog create-product, zahavi catalog list, etc. (oclif).

7. Vista web mínima: listado de productos, detalle con receta, edición. Pasa por ux-ui-reviewer.

8. Cadena final: /verify-architecture → /security-scan (especial atención a RLS de costos) → /pre-commit.
```

---

## ITERACIÓN 3 — Inventory (ingredientes, stock, proveedores, alertas)

```
Lee CLAUDE.md. Trabajamos en el bounded context Inventory.

Plan:
1. Domain-modeler: "modela Inventory. Aggregates: Ingredient (con unidad de medida), StockItem (por business_unit_id, con stock_type RAW/SHOWCASE_READY/IN_PROCESS), StockMovement (tipos PURCHASE_IN, PRODUCTION_OUT, WASTE, TRANSFER_BETWEEN_UNITS, ADJUSTMENT, SALE_OUT, RESERVATION), Supplier, PurchaseOrder, Alert (stock por debajo de mínimo). Stock por ubicación (cada item pertenece a una unidad de negocio: planta o punto). Trazabilidad completa: cada movimiento referencia su origen."

2. Tras modelado, scaffolding en packages/domain/inventory/.

3. Tests TDD: el stock nunca queda negativo (salvo ajuste explícito con razón); cada movimiento es auditado; alertas se emiten al cruzar el mínimo.

4. Migraciones: ingredients, stock_items, stock_movements, suppliers, purchase_orders, alerts. RLS por business_unit_id. Particionar stock_movements por mes (pensando en escala).

5. Casos de uso:
   - RegistrarIngreso (compra) — actualiza stock + costo promedio ponderado
   - RegistrarSalida (genérica)
   - TransferirEntreUnidades
   - RegistrarMerma (con motivo categorizado)
   - AjustarStock (con justificación, restringido a ADMIN/SUPERADMIN)
   - ConfigurarAlerta
   - ListarStockActual (filtrable)
   - HistoricoMovimientos (con paginación)

6. Adapter Supabase para los puertos.

7. Vista web: dashboard de inventario con alertas activas, vista por unidad. Pasa por ux-ui-reviewer.

8. Verificación final completa.
```

---

## ITERACIÓN 4 — Production (planta central)

```
Lee CLAUDE.md. Bounded context Production. Es el más crítico operativamente: aquí ocurre el descuento automático del inventario al producir.

Plan:
1. Domain-modeler: "modela Production. Aggregates: ProductionOrder (productoId + cantidad + business_unit_id origen), ProductionBatch (ejecución concreta), WasteRecord, DispatchToPoint (transferencia desde planta hacia P1/P2). Flujo:
  a) Crear ProductionOrder.
  b) Calcular ingredientes requeridos según receta (BOM explosion).
  c) Verificar disponibilidad en stock de la planta.
  d) Reservar ingredientes (StockMovement RESERVATION).
  e) Al confirmar ejecución: descontar ingredientes (PRODUCTION_OUT), registrar producto terminado en SHOWCASE_READY de la planta o despacharlo al punto solicitante.
  f) Permitir registrar merma con motivo.
  g) Calcular gasto del lote: costo materias + costo empaque + (opcional) prorrateo de mano de obra.
  h) Balance diario de producción: Σ(valor producido) − Σ(gastos) = margen del día.
Considerar que entre BCs Production e Inventory hay un acoplamiento alto: usar Domain Events (StockReservado, StockDescontado, ProductoTerminadoIngresado) y casos de uso transaccionales."

2. Aprobación del modelado.

3. Scaffolding y tests TDD: producir 50 panes consume exactamente lo que dice la receta, ni más ni menos; reservas se liberan si la orden se cancela; merma se registra contra el lote correcto.

4. Migraciones: production_orders, production_batches, waste_records, dispatches.

5. Casos de uso:
   - CrearOrdenDeProduccion
   - EjecutarOrdenDeProduccion (transaccional: reserva + descuento + ingreso)
   - CancelarOrdenDeProduccion (libera reservas)
   - RegistrarMerma
   - DespacharAPunto
   - CerrarBalanceDiarioProduccion

6. Vista web: panel de producción con cola de órdenes, BOM visible, ejecución en un toque. Pasa por ux-ui-reviewer.

7. Verificación final + ADR sobre estrategia transaccional cross-BC (¿outbox pattern? ¿Saga? Decidir).
```

---

## ITERACIÓN 5 — Sales (mesas, comandas, facturación, caja)

```
Lee CLAUDE.md. Bounded context Sales. Es lo que el cliente final ve.

Plan:
1. Domain-modeler: "modela Sales. Aggregates: Table (estado FREE/OCCUPIED/BILL_REQUESTED/CLOSED), Order (con OrderItems, propinas, descuentos), Invoice (factura electrónica DIAN), Payment (efectivo, tarjeta, transferencia, QR, NFC), CashSession (apertura, cierre, arqueo), Discount, Tip. División de cuenta algorítmica (por persona, por ítem, partes iguales). Soporte offline-first."

2. Aprobación.

3. Scaffolding y tests TDD: una factura cuadra con sus pagos; división de cuenta nunca pierde centavos; estado de mesa coherente.

4. Migraciones: tables, orders, order_items, invoices, payments, cash_sessions, discounts, tips. RLS estricto por business_unit_id.

5. Casos de uso:
   - AbrirMesa
   - AgregarItemAOrden / RemoverItem / AjustarCantidad
   - SolicitarFactura
   - DividirCuenta
   - RegistrarPago
   - CerrarMesa
   - AbrirCaja / CerrarCaja (con arqueo asistido)
   - AnularFactura (auditable, restringido)

6. Adapter de impresión ESC/POS para comanda y factura. Configurable por zonas (cocina, barra, caja).

7. Adapter para PT de facturación electrónica DIAN (interfaz primero, una implementación stub; integrar con Alegra/Siigo/Factus en una sub-iteración).

8. Vista web (PWA): toma de pedido en mesa con búsqueda rápida, favoritos, gestos. Pasa por ux-ui-reviewer (es la pantalla más usada del sistema).

9. Verificación final.
```

---

## ITERACIÓN 6 — Offline-first y sincronización

```
Lee CLAUDE.md. Vamos a hacer la app de toma de pedido y cobro completamente operativa sin internet.

Plan:
1. ADR sobre estrategia: SQLite local cifrado en el cliente vía sql.js + IndexedDB; outbox de eventos a sincronizar; resolución de conflictos por last-writer-wins con vector clocks para escrituras concurrentes en mesas distintas.

2. Adapter packages/adapters/persistence-sqlite-offline/ que implementa los mismos puertos que el adapter Supabase, pero contra SQLite local. La capa de aplicación NO sabe cuál está activo.

3. Capa de sincronización: outbox + worker que reintenta con backoff cuando vuelve la conexión. Idempotencia mediante UUIDs y versiones.

4. UI: indicador permanente de estado de conexión, contador de operaciones pendientes, modo "solo lectura" si la sincronización está rota.

5. Tests de propiedad (property-based) sobre la capa de sincronización: garantizar idempotencia ante reintentos arbitrarios y reordenamiento.

6. Test E2E: apagar red, tomar 5 pedidos, cobrar, imprimir, encender red → sincronización completa sin pérdida ni duplicación.

7. Pasa por architect-guardian (el dominio sigue puro), security-auditor (cifrado del SQLite local con clave derivada del JWT del usuario, NUNCA hardcoded).
```

---

## ITERACIÓN 7 — Accounting, dashboards, reportes y auditoría forense

```
Lee CLAUDE.md. Cierre del sistema con la capa de inteligencia de negocio.

Plan:
1. Bounded context Accounting completo: Expense (con ExpenseCategory), DailyClose, Report.

2. Reportes (vistas materializadas + casos de uso):
   - Ventas diarias y por hora
   - Ventas por producto, categoría, método de pago
   - Comisiones por plataformas de domicilios
   - Compras de inventario por proveedor
   - Gastos por categoría
   - Margen real (ventas − COGS − gastos)
   - Balance diario de producción (Iter 4)

3. Dashboard SUPERADMIN: KPIs en tiempo real de los 2 puntos + planta. Drill-down a detalle con un toque.

4. Auditoría forense:
   - Tabla audit_log append-only con hash encadenado.
   - Casos de uso de detección: mermas anómalas (z-score sobre histórico), anulaciones repetidas por usuario, descuentos atípicos, cierres con discrepancia.
   - Vista SUPERADMIN con timeline + filtros + exportación.

5. ux-ui-reviewer sobre dashboard y vistas de reportes (carga rápida, contraste, accesibilidad).

6. doc-writer: runbooks operativos para SUPERADMIN (cierre diario, generación de reportes, respuesta a alerta forense).

7. Verificación final: audit-log no es UPDATE-able ni DELETE-able (REVOKE explícito); RLS impide que ADMIN vea forense de otra unidad si no le corresponde.
```

---

## ITERACIÓN 8 — Endurecimiento y producción

```
Lee CLAUDE.md. Endurecimiento previo a producción.

Plan:
1. Pentest interno guiado por security-auditor: intentar bypass de RLS, IDOR, inyección, escalada de privilegios.

2. Rotación automatizada de claves (JWT secret, claves de cifrado de PII). Documentar y probar el procedimiento.

3. Backups: script y CI que valida restore mensual (game day).

4. Observabilidad completa: OpenTelemetry traces, logs estructurados, dashboards Grafana o equivalente. Alertas críticas (errores 5xx, fallos de sincronización, audit-log con anomalías).

5. Performance: pruebas de carga simulando 200 órdenes/hora por punto. Optimización de queries pesadas.

6. Despliegue productivo:
   - Frontend en Vercel (PWA con headers HSTS, CSP estricto).
   - API en Fly.io o Railway.
   - Supabase en plan Pro o superior con backups habilitados.
   - Vault de secretos productivo (Doppler).

7. Documentación final: manual de operación, runbooks de incidente, plan de respuesta ante brecha (notificación a usuarios y a autoridad si aplica por Habeas Data).

8. Capacitación: guía rápida por rol (`docs/user-guides/{superadmin,admin,worker}/`).

Cierre del proyecto: ADR-FINAL describiendo el estado de la arquitectura entregada y las decisiones futuras pendientes.
```

---

## NOTAS DE OPERACIÓN

- **Una iteración por sprint** sugerido. Si una iteración se siente grande, divídela en sub-iteraciones (4a, 4b, 4c).
- **Cierra y reabre Claude Code entre iteraciones** para liberar contexto y evitar que arrastre decisiones obsoletas.
- **Commits pequeños y frecuentes** dentro de cada iteración. Una "tarea con todo verde" = un commit.
- Si una iteración descubre una decisión que afecta iteraciones futuras, **actualiza este archivo** antes de continuar.
- Cuando algo no esté claro, **detén la iteración** y abre una conversación con Julian. La calidad arquitectónica no se negocia.
