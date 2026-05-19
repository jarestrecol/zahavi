# Glosario Ubicuo — Bounded Context: Identity

> Este glosario fija el lenguaje ubicuo del BC **Identity** para el proyecto Zahavi.
> Todos los nombres aquí definidos deben usarse tal cual en el código, en los tests
> y en las conversaciones con el negocio. Los sinónimos descartados se listan
> explícitamente para evitar derivas de vocabulario.

---

## Tabla de términos

| Término | Definición |
|---|---|
| **Usuario** | Persona física habilitada para interactuar con el sistema bajo un rol determinado (`SUPERADMIN`, `ADMIN`, `WORKER`). Aggregate principal del BC. Tiene identidad estable (`UsuarioId`), estado (`activo` o `deshabilitado`) y credenciales asociadas. Sinónimos descartados: "cuenta", "perfil", "operador". |
| **Rol** | Categoría que define el alcance de autorización de un usuario. Valores admisibles: `SUPERADMIN`, `ADMIN`, `WORKER`. Determina la política de sesión, el método de autenticación y los privilegios visibles desde otros bounded contexts. Sinónimos descartados: "permiso", "grupo", "tipo de usuario". |
| **Credencial** | Mecanismo de autenticación asociado a un usuario. Hay dos tipos diferenciados por rol: `CredencialDeNavegador` (email + contraseña ≥ 12 caracteres con complejidad + TOTP) para `ADMIN`/`SUPERADMIN`, y `CredencialDeTablet` (PIN de 6 dígitos contra un `DispositivoId` autorizado) para `WORKER`. Los hashes se persisten por separado y nunca viajan en claro a logs ni eventos. |
| **CredencialDeNavegador** | Subtipo de credencial: contraseña + secreto TOTP. Aplica a `ADMIN` y `SUPERADMIN`. |
| **CredencialDeTablet** | Subtipo de credencial: PIN ligado a un `DispositivoId` autorizado. Aplica a `WORKER`. |
| **Sesión** | Vínculo activo entre un usuario autenticado y un dispositivo durante un intervalo acotado por una `PoliticaDeSesion`. Aggregate independiente. Sinónimos descartados: "token", "login activo", "ticket". |
| **Dispositivo Autorizado** | Tablet (u otro dispositivo de WORKER) registrado por un ADMIN o SUPERADMIN como permitido para abrir sesión bajo el rol WORKER. Aggregate propio porque su ciclo de vida (alta, revocación, re-autorización) es independiente del de los usuarios. Sinónimos descartados: "device whitelisted", "tablet registrada", "equipo autorizado". |
| **Contexto de Dispositivo** | Etiqueta que clasifica el dispositivo desde el que se abre una sesión: `compartido` (tablet del establecimiento, usada por varios trabajadores) o `personal` (laptop o equipo de un único usuario). Determina si aplica el bloqueo automático de pantalla. Se registra al abrir la sesión y no cambia durante su vida. |
| **Política de Sesión** | VO inmutable que agrupa los tres relojes de vida de una sesión: `umbralBloqueo` (5 min — bloqueo de pantalla, solo en dispositivo compartido), `umbralCierre` (cierre real por inactividad sostenida) y `topeAbsoluto` (duración máxima desde `iniciadaEn`). Incluye `limiteSimultaneo` y `requiereDispositivoAutorizado`. Valores confirmados: SUPERADMIN 30 min/4 h, ADMIN 1 h/8 h, WORKER 30 min/12 h. |
| **Umbral de Bloqueo** | Duración de inactividad (5 min) tras la cual la pantalla se bloquea en **cualquier rol** que opere en un dispositivo compartido. Preserva el contexto operativo (mesas abiertas, comandas) y exige re-autenticación rápida (re-PIN para WORKER, contraseña+TOTP para ADMIN/SUPERADMIN). No aplica en navegador personal. |
| **Umbral de Cierre** | Duración de inactividad sostenida tras la cual la sesión se cierra realmente (motivo `inactividad`). Aplica a todos los contextos. |
| **Tope Absoluto** | Duración máxima desde `iniciadaEn` hasta el cierre forzoso, sin importar la actividad. No se puede refrescar. |
| **Estado de Bloqueo** | Estado ortogonal a `EstadoDeSesion`. Una sesión `activa` puede estar `bloqueada`, lo que exige re-autenticación rápida (re-PIN para WORKER, contraseña + TOTP para ADMIN/SUPERADMIN) sin destruir el contexto operativo (mesas abiertas, comandas en curso). |
| **Bloqueo de Pantalla** | Acción que pasa una sesión `activa` de `desbloqueada` a `bloqueada`. No destruye datos del negocio. Distinto de "cerrar sesión". |
| **Cierre de Sesión** | Acción que pasa la sesión a `cerrada` (voluntario), `expirada` (por inactividad o tope) o `revocada` (administrativa). Termina el vínculo con el dispositivo. |
| **Re-PIN** | Acto de reingresar el PIN para desbloquear pantalla en sesiones de rol `WORKER`. |
| **Re-autorización de Dispositivo** | Acción explícita de un ADMIN o SUPERADMIN que devuelve un `DispositivoAutorizado` del estado `revocado` al estado `activo`. Conserva el `DispositivoId` y agrega una entrada al `historialDeEstados`. |
| **Historial de Estados (Dispositivo)** | Lista inmutable y ordenada de todos los cambios de estado que ha tenido un `DispositivoAutorizado` (autorizaciones, revocaciones, re-autorizaciones). El estado actual es siempre la última entrada. |
| **Mesa Pendiente de Reasignación** | Estado en el BC Sales aplicado a una mesa cuando la sesión del WORKER se cerró por inactividad sin que el WORKER respondiera al aviso. Identity emite el evento `SesionCerradaConMesaAbierta` para que Sales lo gestione. Identity no conoce qué es una mesa, solo lleva su id opaco. |
| **Aviso de 60 segundos** | Notificación a un WORKER 60 segundos antes de cerrar la sesión por inactividad cuando hay mesa abierta. Cualquier interacción durante el aviso reinicia el contador de inactividad. Si no hay respuesta, la sesión se cierra y la mesa pasa a `pendiente_de_reasignacion`. |
| **Último SUPERADMIN** | El único SUPERADMIN activo restante en el sistema. No puede ser deshabilitado, eliminado ni degradado de rol. La invariante se valida en el caso de uso, apoyado por el repositorio. |

---

## Value Objects

| Término | Definición |
|---|---|
| **UsuarioId** | Identificador opaco e inmutable de un usuario. No es email ni nombre. |
| **SesionId** | Identificador opaco e inmutable de una sesión. |
| **DispositivoId** | Identificador opaco asignado por la aplicación al registrar un dispositivo. Nunca proviene de información sensible del hardware (no MAC, no IMEI). Permite revocar sin tocar el dispositivo físico. Se preserva entre re-autorizaciones del mismo aggregate. |
| **MesaId** | Identificador opaco perteneciente al BC Sales. Identity lo transporta sin interpretar su contenido en eventos como `SesionCerradaConMesaAbierta`. |
| **Email** | Dirección de correo válida y normalizada (minúsculas, recortada). Único por usuario. |
| **Contrasena** | Texto verificado contra una política mínima (≥ 12 caracteres, mezcla de clases). Nunca se persiste en claro: se guarda únicamente su `HashDeContrasena`. |
| **Pin** | Secuencia de exactamente 6 dígitos numéricos. Aplica solo a WORKER. Nunca se persiste en claro: se guarda únicamente su `HashDePin`. No se imprime en logs ni se incluye en eventos. |
| **HashDeContrasena** | Hash con sal fuerte de una contraseña. Tipo distinto a `HashDePin` para impedir mezclas accidentales en el código. |
| **HashDePin** | Hash con sal fuerte de un PIN. Tipo distinto a `HashDeContrasena`. |
| **CodigoTotp** | Código numérico temporal verificado contra el secreto TOTP del usuario. Aplica a ADMIN y SUPERADMIN. |
| **SecretoTotp** | Secreto compartido para generar códigos TOTP. Almacenado cifrado. |
| **Duracion** | Magnitud de tiempo expresada en segundos. Inmutable, con operaciones puras (`mas`, `menos`, `mayorQue`). |
| **FechaHora** | Instante en el tiempo en zona `America/Bogota`. Inmutable. |
| **PoliticaDeSesion** | VO inmutable: `{ umbralBloqueo: Duracion, umbralCierre: Duracion, topeAbsoluto: Duracion, limiteSimultaneo: LimiteMaximoDeSesiones, requiereDispositivoAutorizado: boolean }`. Snapshot inmutable registrado en la `Sesion` al abrirla para que cambios globales no alteren contratos en curso. |
| **ContextoDeDispositivo** | Enumerado: `compartido` \| `personal`. Se registra al abrir sesión. El `umbralBloqueo` solo es efectivo si vale `compartido`. |
| **LimiteMaximoDeSesiones** | Entero positivo que indica cuántas sesiones simultáneas puede mantener un usuario. Valores fijos por rol: `WORKER` = 1, `ADMIN` = 3, `SUPERADMIN` = 3. |
| **EstadoDeSesion** | Enumerado: `activa`, `expirada`, `revocada`, `cerrada`. |
| **EstadoDeBloqueo** | Enumerado: `desbloqueada`, `bloqueada`. Ortogonal a `EstadoDeSesion`. Solo válido cuando `EstadoDeSesion = activa`. |
| **EstadoDeUsuario** | Enumerado: `activo`, `deshabilitado`. |
| **EstadoDeDispositivo** | Enumerado: `activo`, `revocado`. |
| **CambioDeEstadoDispositivo** | VO inmutable que describe una transición en el `historialDeEstados` de un `DispositivoAutorizado`. Estructura: `{ estado: EstadoDeDispositivo, cambiadoEn: FechaHora, cambiadoPor: UsuarioId, motivo: string }`. |
| **MotivoDeRevocacionDeSesion** | Enumerado: `cierre_voluntario`, `inactividad`, `tope_absoluto`, `nuevo_login_misma_cuenta`, `revocada_por_admin`, `dispositivo_revocado`, `usuario_deshabilitado`. |

---

## Eventos en pasado (vocabulario)

Los nombres exactos viven en `events.md`. El glosario solo fija el verbo correcto
en pasado para cada hecho del negocio:

- "Se abrió una sesión" → `SesionAbierta`
- "Se cerró una sesión" → `SesionCerrada`
- "La sesión expiró por inactividad" → `SesionExpiradaPorInactividad`
- "La sesión alcanzó su tope absoluto" → `SesionExpiradaPorTopeAbsoluto`
- "Se revocó una sesión por nuevo login" → `SesionAnteriorRevocadaPorNuevoLogin`
- "Se cerró una sesión dejando mesa abierta" → `SesionCerradaConMesaAbierta`
- "Se bloqueó la pantalla" → `PantallaBloqueada`
- "Se desbloqueó la pantalla" → `PantallaDesbloqueada`
- "Se autorizó un dispositivo" → `DispositivoAutorizadoCreado`
- "Se revocó un dispositivo" → `DispositivoRevocado`
- "Se re-autorizó un dispositivo" → `DispositivoReautorizado`
- "Se creó un usuario" → `UsuarioCreado`
- "Se cambió el rol de un usuario" → `RolDeUsuarioCambiado`
- "Se deshabilitó un usuario" → `UsuarioDeshabilitado`
- "Quedó un único SUPERADMIN" → `AlertaUltimoSuperadmin`

---

## Reglas de oro del lenguaje

1. Nunca decimos "login" en código de dominio: decimos **abrir sesión**.
2. Nunca decimos "logout": decimos **cerrar sesión**.
3. Nunca decimos "password" en eventos ni glosario público: decimos
   **contraseña**.
4. Nunca decimos "device whitelist": decimos **dispositivos autorizados**.
5. Nunca usamos "kick" o "boot": decimos **revocar sesión**.
6. **Bloquear pantalla** y **cerrar sesión** son acciones distintas y no deben
   confundirse en el código.
7. **Re-autorizar dispositivo** y **autorizar dispositivo** son comandos
   distintos: el primero opera sobre un aggregate revocado existente; el
   segundo crea uno nuevo.
8. Un cierre de sesión **NUNCA** destruye datos del negocio. Las mesas u
   órdenes en curso se preservan vía estados de reasignación en el BC Sales.
