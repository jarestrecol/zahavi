# Domain Events — Bounded Context: Identity

> Todos los eventos son inmutables y llevan, además del payload listado,
> los campos comunes:
>
> - `eventoId: string` — UUID del evento
> - `aggregateId: string` — id del aggregate que lo emitió (UsuarioId, SesionId
>   o DispositivoId según corresponda)
> - `tipoAggregate: "Usuario" | "Sesion" | "DispositivoAutorizado"`
> - `version: number` — versión del esquema del evento (1 en alta inicial)
> - `occurredAt: FechaHora` — instante en que ocurrió el hecho del negocio
>
> Los payloads listan **solo campos primitivos o VOs serializables**. Nunca
> referencias a aggregates ni objetos mutables. Datos sensibles (PIN,
> contraseña, secretos TOTP) **jamás** aparecen en eventos.

---

## Eventos del aggregate `Usuario`

| Evento | Cuándo ocurre | Payload mínimo |
|---|---|---|
| `UsuarioCreado` | Se da de alta un usuario nuevo. | `usuarioId`, `email`, `nombre`, `rol`, `creadoPor` (puede ser `null` en bootstrap), `creadoEn` |
| `EmailDeUsuarioCambiado` | Cambio de email. | `usuarioId`, `emailAnterior`, `emailNuevo` |
| `NombreDeUsuarioCambiado` | Cambio de nombre. | `usuarioId`, `nombreAnterior`, `nombreNuevo` |
| `RolDeUsuarioCambiado` | Cambio de rol (con nueva credencial coherente). | `usuarioId`, `rolAnterior`, `rolNuevo`, `cambiadoEn` |
| `ContrasenaDeUsuarioCambiada` | Rotación de contraseña (ADMIN/SUPERADMIN). | `usuarioId`, `cambiadaEn`. **No** incluir hash. |
| `PinDeUsuarioCambiado` | Rotación de PIN (WORKER). | `usuarioId`, `cambiadoEn`. **No** incluir hash. |
| `SecretoTotpRegenerado` | Se genera un nuevo secreto TOTP. | `usuarioId`, `regeneradoEn`. **No** incluir el secreto. |
| `TotpDeUsuarioVerificado` | Primer enrolamiento TOTP completado. | `usuarioId`, `verificadoEn` |
| `UsuarioDeshabilitado` | Se deshabilita el usuario. | `usuarioId`, `deshabilitadoPor`, `deshabilitadoEn`, `motivo` |
| `UsuarioRehabilitado` | Se rehabilita un usuario previamente deshabilitado. | `usuarioId`, `rehabilitadoPor`, `rehabilitadoEn` |
| `AlertaUltimoSuperadmin` | El sistema detecta que solo queda 1 SUPERADMIN activo. **Emitido por caso de uso, no por aggregate**. | `usuarioId` (el SUPERADMIN restante), `emitidaEn` |

---

## Eventos del aggregate `Sesion`

| Evento | Cuándo ocurre | Payload mínimo |
|---|---|---|
| `SesionAbierta` | Se abre una sesión nueva tras autenticación exitosa. | `sesionId`, `usuarioId`, `rol`, `dispositivoId` (puede ser `null` para ADMIN/SUPERADMIN), `iniciadaEn`, `expiraEnAbsoluto`, `inactividadMaximaSeg`, `topeAbsolutoSeg` |
| `ActividadDeSesionRegistrada` | (Opcional) interacción que reinicia inactividad. Puede omitirse para reducir ruido. | `sesionId`, `usuarioId`, `registradaEn` |
| `PantallaBloqueada` | La sesión activa pasa a `bloqueada`. | `sesionId`, `usuarioId`, `bloqueadaEn` |
| `PantallaDesbloqueada` | Sesión `bloqueada` vuelve a `desbloqueada` tras re-autenticación rápida. | `sesionId`, `usuarioId`, `desbloqueadaEn` |
| `SesionCerrada` | Cierre voluntario por el usuario. | `sesionId`, `usuarioId`, `cerradaEn`, `motivo` (= `cierre_voluntario`) |
| `SesionExpiradaPorInactividad` | Inactividad > `inactividadMaxima`. | `sesionId`, `usuarioId`, `expiradaEn`, `ultimaActividadEn` |
| `SesionExpiradaPorTopeAbsoluto` | Se alcanzó `expiraEnAbsoluto`. | `sesionId`, `usuarioId`, `expiradaEn`, `iniciadaEn` |
| `SesionRevocada` | Revocación administrativa o en cascada. | `sesionId`, `usuarioId`, `revocadaEn`, `motivo` (`revocada_por_admin` \| `dispositivo_revocado` \| `usuario_deshabilitado`), `revocadaPor` (UsuarioId si aplica, `null` en cascada automática) |
| `SesionAnteriorRevocadaPorNuevoLogin` | WORKER abre sesión en otro dispositivo y se revoca la anterior. **Emitido por caso de uso `AbrirSesion`**. | `sesionIdRevocada`, `sesionIdNueva`, `usuarioId`, `revocadaEn` |
| `SesionCerradaConMesaAbierta` | Sesión WORKER se cierra por inactividad y tenía mesas abiertas. **Emitido por caso de uso `ExpirarSesionesVencidas`**. BC Sales lo consume para marcar las mesas como `PENDIENTE_DE_REASIGNACION`. | `sesionId`, `usuarioId`, `unidadId`, `mesasAbiertas: MesaId[]`, `cerradaEn` |

---

## Eventos del aggregate `DispositivoAutorizado`

| Evento | Cuándo ocurre | Payload mínimo |
|---|---|---|
| `DispositivoAutorizadoCreado` | Un ADMIN/SUPERADMIN registra una tablet. | `dispositivoId`, `nombre`, `autorizadoPor`, `autorizadoEn` |
| `DispositivoRevocado` | Se revoca el dispositivo. Dispara cascada a sesiones. | `dispositivoId`, `revocadoPor`, `revocadoEn`, `motivo` |
| `DispositivoReautorizado` | Dispositivo revocado vuelve a estado activo. El `DispositivoId` se conserva. | `dispositivoId`, `reautorizadoPor`, `reautorizadoEn`, `motivo` |
| `DispositivoRenombrado` | Cambio de etiqueta humana. | `dispositivoId`, `nombreAnterior`, `nombreNuevo` |

---

## Suscriptores típicos (no exhaustivo)

| Evento | Suscriptor | Acción |
|---|---|---|
| `UsuarioDeshabilitado` | Handler en BC Identity | Revoca todas las sesiones activas del usuario. |
| `DispositivoRevocado` | Handler en BC Identity | Revoca todas las sesiones activas asociadas a `dispositivoId`. |
| `RolDeUsuarioCambiado` | Handler en BC Identity | Revoca sesiones activas (el snapshot de rol queda obsoleto y la política puede haber cambiado). |
| `SesionCerradaConMesaAbierta` | BC Sales (eventual) | Marca las mesas listadas en el payload como `PENDIENTE_DE_REASIGNACION`. Genera entrada de auditoría: "mesa X liberada por timeout del WORKER Y a las HH:MM". |
| `SesionExpiradaPorInactividad` / `SesionExpiradaPorTopeAbsoluto` / `SesionRevocada` / `SesionCerrada` | BC Sales (eventual) | Cierra mesas abiertas o las marca como huérfanas para recuperación (si no fue cubierto por `SesionCerradaConMesaAbierta`). |
| `AlertaUltimoSuperadmin` | BC Auditing + canal de notificación | Registra la alerta y notifica a Julian. |
| Todos los eventos de Identity | BC Auditing | Persiste entrada en `audit_log` con hash encadenado. |

---

## Reglas para todos los eventos

1. **Inmutables**: una vez emitidos no se modifican. Correcciones se hacen
   con eventos compensatorios.
2. **Sin secretos**: ningún payload contiene PIN, contraseña, hash, secreto
   TOTP, ni códigos TOTP.
3. **Sin objetos de aggregate**: solo primitivos y VOs serializables.
4. **Tiempo en `America/Bogota`**: serializado con offset explícito.
5. **Versionado**: cada evento lleva `version` para evolución futura del
   esquema.
