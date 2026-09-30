# Data Model: Colección LEGO del usuario

## AuthenticatedUser

| Campo | Tipo | Reglas |
|---|---|---|
| `sub` | string | Obligatorio, no vacío y obtenido exclusivamente del JWT validado por API Gateway. Nunca procede de path, query o body. |

`email`, `username` y otros claims no son claves de autorización ni persistencia.

## CollectionSet

Una instancia personal de un set de catálogo. El mismo catálogo puede aparecer en varios registros del usuario.

| Campo público | Tipo | Reglas |
|---|---|---|
| `collectionSetId` | UUIDv7 | Generado por el servicio, inmutable. |
| `catalogSetId` | integer | Obligatorio al crear, positivo e inmutable. |
| `quantity` | integer | Default `1`, entre `1` y `99`. |
| `condition` | enum | Default `used`; `sealed`, `new`, `used` o `incomplete`. |
| `notes` | string/null | Opcional, trim, máximo 1,000; `null` la elimina. |
| `acquiredOn` | date/null | ISO `YYYY-MM-DD`, no futura; `null` la elimina. |
| `createdAt` | UTC timestamp | Generado por servicio e inmutable. |
| `updatedAt` | UTC timestamp | Generado al crear y editar. |

| Campo interno DynamoDB | Valor/regla |
|---|---|
| `PK` | `USER#<sub>`, desde `AuthenticatedUser.sub`. |
| `SK` | `SET#<collectionSetId>`. |
| `entityType` | `COLLECTION_SET`, condición de integridad. |
| `destination` | `collection`, asignado por el servicio. |

`sub`, `PK`, `SK`, `entityType` y `destination` no se exponen ni son editables.

## CreateCollectionSetInput

`catalogSetId` es obligatorio y positivo. `quantity` es opcional (`1..99`, default `1`), `condition` opcional (default `used`), y `notes`/`acquiredOn` opcionales o `null`. El objeto es estricto: campos de propietario, internos o desconocidos son inválidos.

## UpdateCollectionSetInput

Exige al menos uno de `quantity`, `condition`, `notes` o `acquiredOn`, bajo las mismas reglas. `catalogSetId`, propietario y todos los campos internos son inmutables y no se aceptan.

## CollectionPage

| Campo | Tipo | Reglas |
|---|---|---|
| `items` | `CollectionSet[]` | Solo elementos de la partición autenticada. |
| `page.limit` | integer | `1..100`, default `20`. |
| `page.nextCursor` | string/null | Cursor base64url opaco, máximo 2,048; nunca contiene ni acepta `sub`. |

## States and transitions

```text
create -> activo -> update -> activo
                 -> delete -> inexistente
```

Actualizar o borrar un set ajeno se presenta como `inexistente` y responde `404 RESOURCE_NOT_FOUND`. No hay borrado lógico, wishlist ni compartición.

## ErrorResponse

| Campo | Tipo | Regla |
|---|---|---|
| `status` | `error` | Envelope de error. |
| `code` | código estable | `VALIDATION_ERROR`, `UNAUTHENTICATED`, `RESOURCE_NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL_ERROR`. |
| `message` | string seguro | Sin token, claims personales, secretos, stack trace o detalles DynamoDB. |
| `details` | array opcional | Solo validación; sin repetir valores enviados. |
