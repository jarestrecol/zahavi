# Mapa de Aggregates — Bounded Context: Identity

> Modelo de dominio del BC Identity. Decisiones de Julian incorporadas:
> TTL deslizante con tope absoluto, tres umbrales de sesión para WORKER
> (5 min bloqueo / 30 min cierre / 12 h tope), bloqueo de pantalla para todos
> los roles en dispositivos compartidos, sesiones múltiples por rol, invariante
> del último SUPERADMIN, credenciales diferenciadas (PIN+dispositivo para
> WORKER, contraseña+TOTP para ADMIN/SUPERADMIN), y re-autorización de
> dispositivos con historial inmutable.

---

## Resumen

El BC Identity contiene tres aggregates:

1. **Usuario** — identidad de la persona y sus credenciales.
2. **Sesion** — vínculo activo y temporal entre usuario y dispositivo.
3. **DispositivoAutorizado** — tablets habilitadas para sesiones de WORKER.

La consistencia entre aggregates es eventual y se coordina vía Domain Events y
casos de uso (no vía referencias directas).

---

## Aggregate 1: Usuario

### Aggregate Root
`Usuario`

### Atributos
- `id: UsuarioId`
- `email: Email`
- `nombre: string`
- `rol: Rol` (`SUPERADMIN` | `ADMIN` | `WORKER`)
- `estado: EstadoDeUsuario` (`activo` | `deshabilitado`)
- `credencial: Credencial`
  - Si rol es `WORKER`: `CredencialDeTablet { hashDePin: HashDePin }`
  - Si rol es `ADMIN` o `SUPERADMIN`:
    `CredencialDeNavegador { hashDeContrasena: HashDeContrasena, secretoTotp: SecretoTotp, totpVerificado: boolean }`
- `creadoEn: FechaHora`
- `creadoPor: UsuarioId | null` (null solo para el SUPERADMIN inicial de bootstrap)
- `ultimoCambioDeRolEn: FechaHora | null`

### Invariantes (numerados)

1. **Email único**: dos usuarios distintos no pueden compartir el mismo email
   normalizado.
2. **Tipo de credencial coherente con rol**:
   - Si `rol = WORKER`, la credencial debe ser `CredencialDeTablet`.
   - Si `rol ∈ {ADMIN, SUPERADMIN}`, la credencial debe ser
     `CredencialDeNavegador`.
3. **Política de PIN**: el PIN tiene exactamente 6 dígitos numéricos. Nunca se
   persiste en claro; solo `HashDePin`.
4. **Política de contraseña**: la contraseña tiene mínimo 12 caracteres y
   complejidad (al menos una mayúscula, una minúscula, un dígito y un símbolo).
   Nunca se persiste en claro; solo `HashDeContrasena`.
5. **TOTP obligatorio**: un `ADMIN` o `SUPERADMIN` no puede operar si
   `totpVerificado = false`.
6. **No autoasignación de SUPERADMIN**: un ADMIN no puede crear un SUPERADMIN ni
   promover a otro usuario a SUPERADMIN. Solo otro SUPERADMIN puede.
7. **Último SUPERADMIN inviolable**: no se puede deshabilitar, eliminar ni
   degradar de rol al último SUPERADMIN activo del sistema. La transición
   requiere que exista al menos otro SUPERADMIN activo distinto. Esta
   invariante no se valida en el aggregate `Usuario` aislado (no conoce a los
   demás): se valida en el caso de uso correspondiente apoyándose en
   `RepositorioDeUsuarios.contarSuperadminsActivos()`. El aggregate solo expone
   los comandos; el caso de uso es responsable de garantizar la invariante
   antes de invocarlos.
8. **Cambio de rol consistente**: cambiar de rol implica reemplazar la
   credencial completa, porque el tipo de credencial está atado al rol
   (invariante 2). El comando `cambiarRol` exige una credencial nueva del tipo
   correcto.
9. **Solo el propio usuario o un ADMIN/SUPERADMIN** puede iniciar el cambio de
   contraseña / PIN. Esta autorización se verifica en el caso de uso, no en el
   aggregate.

### Comandos aceptados
- `Usuario.crear({ id, email, nombre, rol, credencial, creadoPor, ahora })`
- `cambiarEmail(nuevoEmail)`
- `cambiarNombre(nuevoNombre)`
- `cambiarRol(nuevoRol, nuevaCredencial, ahora)` *(la verificación de "último
  SUPERADMIN" la hace el caso de uso antes de llamar a este comando)*
- `cambiarContrasena(nuevoHashDeContrasena)` *(solo ADMIN/SUPERADMIN)*
- `cambiarPin(nuevoHashDePin)` *(solo WORKER)*
- `regenerarSecretoTotp(nuevoSecreto)` *(solo ADMIN/SUPERADMIN)*
- `marcarTotpVerificado()`
- `deshabilitar(ahora)` *(la verificación de "último SUPERADMIN" la hace el
  caso de uso)*
- `rehabilitar(ahora)`

### Eventos emitidos
- `UsuarioCreado`
- `EmailDeUsuarioCambiado`
- `NombreDeUsuarioCambiado`
- `RolDeUsuarioCambiado`
- `ContrasenaDeUsuarioCambiada`
- `PinDeUsuarioCambiado`
- `SecretoTotpRegenerado`
- `TotpDeUsuarioVerificado`
- `UsuarioDeshabilitado`
- `UsuarioRehabilitado`

### Errores de dominio
- `EmailInvalidoError`
- `EmailYaRegistradoError` *(detectado por el caso de uso vía repositorio)*
- `CredencialIncoherenteConRolError`
- `PinInvalidoError`
- `ContrasenaDebilError`
- `RolNoAutorizadoParaCrearError`
- `UltimoSuperadminProtegidoError`
- `UsuarioNoActivoError`

---

## Aggregate 2: Sesion

### Aggregate Root
`Sesion`

### Atributos
- `id: SesionId`
- `usuarioId: UsuarioId`
- `rol: Rol` *(snapshot del rol al momento de abrir la sesión)*
- `dispositivoId: DispositivoId | null` *(obligatorio si rol = WORKER; opcional
  para ADMIN/SUPERADMIN)*
- `politica: PoliticaDeSesion` *(snapshot de la política aplicada al abrir)*
- `iniciadaEn: FechaHora`
- `ultimaActividadEn: FechaHora`
- `expiraEnAbsoluto: FechaHora` *(igual a `iniciadaEn + politica.topeAbsoluto`)*
- `estadoSesion: EstadoDeSesion`
- `estadoBloqueo: EstadoDeBloqueo`
- `contextoDispositivo: ContextoDeDispositivo` (`compartido` | `personal`)
- `bloqueadaEn: FechaHora | null`
- `cerradaEn: FechaHora | null`
- `motivoDeCierre: MotivoDeRevocacionDeSesion | null`

### Invariantes

1. **Dispositivo obligatorio para WORKER**: si `rol = WORKER`, `dispositivoId`
   no puede ser `null`.
2. **Snapshot inmutable de política**: una vez abierta la sesión, la `politica`
   y el `expiraEnAbsoluto` no cambian. Si la política del rol cambia
   globalmente, las sesiones ya abiertas mantienen su contrato hasta cerrar.
3. **Tope absoluto inviolable**: `ahora >= expiraEnAbsoluto` implica que la
   sesión está expirada con `motivoDeCierre = tope_absoluto`. No se puede
   refrescar una sesión que ya alcanzó el tope absoluto.
4. **Inactividad deslizante**: la sesión expira por inactividad si
   `ahora - ultimaActividadEn > politica.inactividadMaxima`. Cualquier
   comando de actividad (`registrarActividad`) reinicia el reloj de
   inactividad pero **no** mueve `expiraEnAbsoluto`.
5. **Bloqueo solo si activa**: `estadoBloqueo = bloqueada` solo es válido
   cuando `estadoSesion = activa`. Una sesión `expirada`, `revocada` o
   `cerrada` no admite estado de bloqueo.
6. **Bloqueo automático según contexto**: el bloqueo automático por
   `umbralBloqueo` aplica cuando `contextoDispositivo = compartido` para
   **todos los roles**. En `contextoDispositivo = personal` el umbral de
   bloqueo es ignorado; solo rigen `umbralCierre` y `topeAbsoluto`.
7. **Desbloqueo según rol**: el comando `desbloquear` exige re-PIN si
   `rol = WORKER`, o contraseña + TOTP si `rol ∈ {ADMIN, SUPERADMIN}`.
8. **Cierre idempotente**: cerrar una sesión ya cerrada/expirada/revocada no
   produce nuevos eventos ni cambia el motivo de cierre original.
9. **Coherencia de límite simultáneo**: el aggregate `Sesion` no conoce a las
   demás sesiones del usuario. La invariante "no exceder
   `LimiteMaximoDeSesiones` por usuario" se verifica en el caso de uso
   `AbrirSesion` antes de instanciar la nueva sesión:
   - Si `rol = WORKER` y ya existe una sesión activa, esa sesión anterior se
     **revoca automáticamente** (motivo `nuevo_login_misma_cuenta`) y se
     emite `SesionAnteriorRevocadaPorNuevoLogin`. Solo después se crea la
     nueva.
   - Si `rol ∈ {ADMIN, SUPERADMIN}` y ya hay 3 sesiones activas, se rechaza
     con `LimiteDeSesionesAlcanzadoError` y el usuario debe revocar una
     manualmente desde el panel de dispositivos activos.
10. **Dispositivo autorizado vigente**: para abrir una sesión WORKER, el
    `dispositivoId` debe corresponder a un `DispositivoAutorizado` con
    `estado = activo`. Esta verificación es responsabilidad del caso de uso
    `AbrirSesion`.
11. **Reloj monótono**: cualquier comando que reciba `ahora: FechaHora` debe
    cumplir `ahora >= ultimaActividadEn`. Se rechaza con `RelojRetrocedidoError`
    si el llamador envía un instante anterior.

### Comandos aceptados
- `Sesion.abrir({ id, usuarioId, rol, dispositivoId, politica, ahora })`
- `registrarActividad(ahora)`
- `bloquearPantalla(ahora)`
- `desbloquear(ahora)` *(el caso de uso ya verificó PIN o contraseña+TOTP
  según el rol)*
- `cerrarVoluntariamente(ahora)`
- `revocar(motivo, ahora)` *(motivos: `revocada_por_admin`,
  `dispositivo_revocado`, `usuario_deshabilitado`,
  `nuevo_login_misma_cuenta`)*
- `expirarSiCorresponde(ahora)` *(idempotente: marca expirada por inactividad
  o por tope absoluto si aplica)*

### Eventos emitidos
- `SesionAbierta`
- `ActividadDeSesionRegistrada` *(opcional; puede omitirse para reducir ruido
  y emitir solo cierres/expiraciones)*
- `PantallaBloqueada`
- `PantallaDesbloqueada`
- `SesionCerrada`
- `SesionExpiradaPorInactividad`
- `SesionExpiradaPorTopeAbsoluto`
- `SesionRevocada`
- `SesionAnteriorRevocadaPorNuevoLogin` *(emitida por el caso de uso
  `AbrirSesion`, no por el aggregate)*

### Errores de dominio
- `DispositivoRequeridoParaWorkerError`
- `SesionYaCerradaError`
- `SesionBloqueadaError` *(intento de actividad sin desbloquear)*
- `RolNoPermiteRePinError`
- `RelojRetrocedidoError`
- `SesionExpiradaError`
- `LimiteDeSesionesAlcanzadoError`
- `DispositivoNoAutorizadoError`

### Política de sesión por rol (snapshot al abrir)

| Rol | Inactividad máxima | Tope absoluto | Sesiones simultáneas | Requiere dispositivo autorizado |
|---|---|---|---|---|
| `SUPERADMIN` | 30 min | 4 h | 3 | No |
| `ADMIN` | 1 h | 8 h | 3 | No |
| `WORKER` | 30 min | 12 h | 1 | Sí |

> El `umbralBloqueo` (5 min) aplica a todos los roles cuando
> `contextoDispositivo = compartido`. Para `personal` solo rigen
> `umbralCierre` y `topeAbsoluto`.

### Los tres relojes de la sesión WORKER

El modelo WORKER tiene tres umbrales confirmados por Julian:

| Umbral | Duración | Efecto |
|---|---|---|
| `umbralBloqueo` | 5 min sin actividad (en dispositivo compartido) | Bloqueo de pantalla con re-PIN; contexto operativo preservado |
| `umbralCierre` | 30 min sin actividad sostenida | Cierre real de sesión |
| `topeAbsoluto` | 12 h desde `iniciadaEn` | Re-login obligatorio aunque haya actividad continua |

Si al borde de `umbralCierre` hay mesa abierta u orden en curso, la UI
muestra aviso 60 s antes. Cualquier interacción reinicia el contador de
inactividad. Si no hay respuesta, la sesión se cierra y se emite
`SesionCerradaConMesaAbierta` para que el BC Sales marque la mesa como
`PENDIENTE_DE_REASIGNACION`. **Un cierre de sesión nunca destruye datos
del negocio.**

---

## Aggregate 3: DispositivoAutorizado

### Aggregate Root
`DispositivoAutorizado`

### Atributos
- `id: DispositivoId`
- `nombre: string` *(etiqueta humana, p.ej. "Tablet Caja 1 - Sede Centro")*
- `historialDeEstados: ReadonlyArray<CambioDeEstadoDispositivo>` *(al menos 1 entrada: la autorización inicial)*
- `estado: EstadoDeDispositivo` — derivado de `historialDeEstados.at(-1).estado`

> `CambioDeEstadoDispositivo = { estado: EstadoDeDispositivo, cambiadoEn: FechaHora, cambiadoPor: UsuarioId, motivo: string }`

### Invariantes

1. **Solo ADMIN o SUPERADMIN puede autorizar, revocar o re-autorizar**. Verificado
   por el caso de uso (depende del aggregate `Usuario` del solicitante).
2. **Idempotencia de revocación**: revocar un dispositivo ya revocado no
   agrega entrada al historial ni emite evento nuevo.
3. **Re-autorización permitida con historial**: un dispositivo `revocado` puede
   volver a estado `activo` mediante acción explícita de ADMIN/SUPERADMIN. El
   `DispositivoId` se conserva; el estado pasa de `revocado` a `activo` y se
   agrega una nueva entrada `CambioDeEstadoDispositivo` al historial. La
   trazabilidad completa se preserva en `historialDeEstados`.
4. **Revocación cascada a sesiones**: cuando un dispositivo se revoca, todas
   las sesiones activas con `dispositivoId = id` deben ser revocadas con
   motivo `dispositivo_revocado`. La cascada la ejecuta el caso de uso, no el
   aggregate.
5. **Nombre obligatorio**: `nombre` no puede estar vacío. La unicidad por
   nombre la verifica el caso de uso vía repositorio.
6. **Estado derivado del historial**: el campo `estado` es siempre el de la
   última entrada de `historialDeEstados`. No se puede mutar directamente.

### Comandos aceptados
- `DispositivoAutorizado.autorizar({ id, nombre, autorizadoPor, ahora })`
- `revocar({ revocadoPor, motivo, ahora })`
- `reautorizar({ reautorizadoPor, motivo, ahora })`
- `renombrar(nuevoNombre)`

### Eventos emitidos
- `DispositivoAutorizadoCreado`
- `DispositivoRevocado`
- `DispositivoReautorizado`
- `DispositivoRenombrado`

### Errores de dominio
- `NombreDeDispositivoVacioError`
- `DispositivoYaActivoError` *(re-autorizar un dispositivo que ya está activo)*
- `DispositivoNoActivoError`

---

## Coordinación entre aggregates (resumen)

| Operación | Caso de uso | Aggregates involucrados | Mecanismo |
|---|---|---|---|
| Abrir sesión WORKER | `AbrirSesion` | `Usuario` (lectura), `DispositivoAutorizado` (lectura), `Sesion` (escritura, posible revocación previa) | Verificación previa + transacción por aggregate |
| Abrir sesión ADMIN/SUPERADMIN | `AbrirSesion` | `Usuario` (lectura), `Sesion` (escritura) | Verificación de límite simultáneo |
| Deshabilitar usuario | `DeshabilitarUsuario` | `Usuario` (escritura), `Sesion` (revocación masiva por evento) | Domain event `UsuarioDeshabilitado` → handler revoca sesiones |
| Revocar dispositivo | `RevocarDispositivo` | `DispositivoAutorizado` (escritura), `Sesion` (revocación por evento) | Domain event `DispositivoRevocado` → handler revoca sesiones del dispositivo |
| Re-autorizar dispositivo | `ReautorizarDispositivo` | `DispositivoAutorizado` (escritura) | Agrega entrada al historial; `DispositivoId` se conserva |
| Cambiar rol | `CambiarRolDeUsuario` | `Usuario` (escritura) | Verifica invariante de último SUPERADMIN antes |
| Detección de "último SUPERADMIN" | Caso de uso de cualquier acción que pueda dejar 0 SUPERADMINs activos | `Usuario` (lectura agregada) | Emite `AlertaUltimoSuperadmin` cuando quede solo 1 |

---

## Decisiones tomadas

1. **`DispositivoAutorizado` como aggregate propio** y no entidad anidada en
   `Usuario`: su ciclo de vida es independiente (puede ser autorizado por
   alguien y revocado por otro, persiste sin importar qué WORKERs lo usen).
2. **Snapshot de `politica` y `rol` en la sesión**: evita que cambios globales
   alteren contratos de sesiones ya en curso.
3. **`EstadoDeBloqueo` ortogonal a `EstadoDeSesion`**: refleja la realidad
   operativa de que un WORKER bloquea la pantalla sin perder su mesa.
4. **Última verificación de SUPERADMIN en caso de uso**, no en aggregate: el
   aggregate `Usuario` aislado no puede saber cuántos SUPERADMINs hay.
5. **Cascada de revocación vía Domain Events**, no vía referencias directas
   entre aggregates: respeta la consistencia eventual y mantiene aggregates
   pequeños.
6. **Política de sesión por rol como VO inmutable**: permite trazabilidad
   exacta de qué política regía una sesión histórica.
7. **Hash de PIN y hash de contraseña como tipos distintos**: previene
   confusión y facilita auditoría estática.
8. **Re-autorización de dispositivos con historial inmutable**: el mismo
   `DispositivoId` puede pasar de `revocado` a `activo`; el historial
   completo se preserva para auditoría forense.
9. **Bloqueo de pantalla aplica a todos los roles en dispositivos compartidos**:
   no solo a WORKER; cualquier rol puede operar en una tablet compartida.
