# Research: Perfil autenticado de usuario

## Persistencia e idempotencia

### Decision

Reutilizar `UserDataTable` con `PK = USER#<sub>` y `SK = PROFILE`; el ítem incluye `entityType = USER_PROFILE`, `profileId`, `createdAt` y `updatedAt`. `GET` usa `GetItem` por clave completa. `PUT` realiza una lectura consistente; si no existe, ejecuta `PutItem` con `attribute_not_exists(PK) AND attribute_not_exists(SK)`. Si una carrera pierde la condición, vuelve a leer y devuelve el perfil ganador.

### Rationale

El perfil queda físicamente aislado en la partición autenticada y no contamina la consulta de sets (`SK` empieza con `SET#`). La condición evita duplicados sin añadir tabla ni índice. La lectura posterior a una colisión hace que un inicio de sesión concurrente reciba el mismo perfil lógico.

### Alternatives considered

- Tabla de perfiles separada: añade infraestructura y permisos sin aportar valor para este patrón de acceso.
- `UpdateItem` con `if_not_exists`: atómico, pero puede cambiar metadatos en cada PUT y complica distinguir creación de recuperación.
- Clave por correo: descartada porque el correo es mutable y no es la identidad autorizada.

## JWT y contrato iOS

### Decision

Proteger ambas rutas con el JWT authorizer existente, sin scopes adicionales. iOS envía `Authorization: Bearer <access token>` y, en PUT, un body validado con `email`, `displayName` y `defaultMarket`; el handler lee el `sub` propagado por API Gateway exclusivamente para propiedad. PUT siempre devuelve `200` con el perfil creado o existente y el indicador `created`. GET devuelve `200` o `404 PROFILE_NOT_FOUND` si aún no existe.

### Rationale

El flujo iOS llama PUT al completar login y GET al restaurar sesión; el access token obtenido por el flujo de correo/contraseña no necesita un nuevo scope de perfil. La app ya conoce el correo autenticado, pero ese valor nunca autoriza ni selecciona el registro. Un `200` uniforme en PUT simplifica la recuperación ante reintentos.

### Alternatives considered

- Usar `201` al crear: descartado porque el cliente debe decodificar una respuesta consistente ante creación o repetición.
- Obtener correo del access token: descartado porque no debe suponerse que el claim está presente; iOS lo envía solo como atributo validado.
- Añadir scopes de perfil: aplazado hasta que el flujo iOS los solicite explícitamente.

## Compatibilidad de DTO

### Decision

El contrato expone `userId`, `email`, `displayName`, `defaultMarket`, `authProviders`, `createdAt` y `updatedAt`; PUT también expone `created`. Es la forma exacta que decodifica el repositorio iOS actual.

### Rationale

La auditoría de `LiveProfileRepository`, `ProfileDTO` y `APIClient` confirmó esos campos y que bootstrap ya tiene email disponible en su composición de app.
