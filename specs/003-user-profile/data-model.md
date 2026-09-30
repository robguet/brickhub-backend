# Data Model: Perfil autenticado de usuario

## UserProfile

| Campo público | Tipo | Reglas |
|---|---|---|
| `userId` | UUIDv7 | Generado por el servicio una sola vez; inmutable. |
| `email` | email | Obligatorio en PUT; validado, máximo 254 caracteres; no autoriza ni identifica la partición. |
| `displayName` | string | Obligatorio en PUT; trim, entre 1 y 100 caracteres. |
| `defaultMarket` | enum | Obligatorio en PUT; uno de `MX`, `US`, `ES`. |
| `authProviders` | string array | Asignado por el servicio; inicialmente `["cognito"]`. |
| `createdAt` | timestamp UTC | Generado al inicializar; inmutable. |
| `updatedAt` | timestamp UTC | Igual a `createdAt` en esta versión; no hay edición de perfil. |

| Campo interno | Regla |
|---|---|
| `PK` | `USER#<sub>` derivado exclusivamente del JWT validado. |
| `SK` | Literal `PROFILE`. |
| `entityType` | Literal `USER_PROFILE`. |

Los campos internos, `sub`, correo, JWT y otros datos de identidad no se aceptan ni se devuelven.

## InitializeProfileInput

`PUT /v1/profile` acepta exactamente `email`, `displayName` y `defaultMarket`. `userId`, `sub`, `authProviders`, timestamps y cualquier campo desconocido son inválidos.

## States

```text
inexistente --PUT--> perfil inicializado --GET/PUT--> perfil inicializado
```

Un `GET` en estado inexistente responde `404 PROFILE_NOT_FOUND`. Dos PUT simultáneos convergen al mismo perfil inicializado.

## Envelopes

Éxito GET: `{ "status": "success", "profile": UserProfile }`. Éxito PUT añade `"created": boolean`.

Error: `{ "status": "error", "code": string, "message": string }`, con `UNAUTHENTICATED`, `PROFILE_NOT_FOUND`, `VALIDATION_ERROR` o `INTERNAL_ERROR`; nunca incluye secretos, token, `sub` o detalles DynamoDB.
