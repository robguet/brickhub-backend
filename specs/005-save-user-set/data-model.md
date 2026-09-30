# Data Model: Set guardado del usuario

## AuthenticatedUser

| Campo | Tipo | Regla |
|---|---|---|
| `sub` | string | Obligatorio, no vacío y solo desde el JWT validado; nunca body, path ni query. |

## SaveUserSetInput

| Campo | Tipo | Regla |
|---|---|---|
| `destination` | enum | Obligatorio: `collection` o `wishlist`. |
| `set` | SetSnapshotInput | Obligatorio y estricto; no admite propietario, claves internas ni claves desconocidas. |

## SetSnapshotInput

| Campo | Tipo | Regla |
|---|---|---|
| `setID` | integer | Obligatorio, positivo; parte de la clave de deduplicación. |
| `number` | string | Obligatorio, no vacío, máximo 64. |
| `numberVariant` | integer | Obligatorio, no negativo. |
| `name` | string | Obligatorio, no vacío, máximo 500. |
| `year` | integer | Obligatorio, 1949–2100. |
| `theme` | string | Obligatorio, no vacío, máximo 200. |
| `subtheme` | string | Opcional, no vacío, máximo 200. |
| `category` | string | Obligatorio, no vacío, máximo 100. |
| `released` | boolean | Obligatorio. |
| `pieces` | integer | Obligatorio, no negativo. |
| `launchDate`, `exitDate`, `lastUpdated` | timestamp UTC | Opcionales ISO 8601 con `Z`. |
| `image` | object | Opcional; si existe, `thumbnailURL` e `imageURL` son URLs HTTPS. |
| `bricksetURL` | URL | Opcional; HTTPS. |
| `rating` | number | Opcional, 0–5. |
| `ratingCount`, `reviewCount` | integer | Opcionales, no negativos. |
| `packagingType` | string | Opcional, no vacío, máximo 100. |
| `barcode.EAN` | string | Opcional junto con `barcode`; 8–14 dígitos. |

## SavedSet y persistencia

| Campo | Regla |
|---|---|
| `destination` | Destino inmutable. |
| `set` | Snapshot validado e inmutable para esta operación. |
| `createdAt`, `updatedAt` | UTC generado en el primer guardado; no cambia en un reintento. |
| `created` | Solo respuesta: `true` alta, `false` reintento. |
| `PK` | Interno: `USER#<sub>`. |
| `SK` | Interno: `SAVED_SET#<setID>`. |
| `entityType` | Interno: `SAVED_SET`. |

La identidad natural es `(sub, setID)`: un set existe una sola vez para el usuario y puede cambiar su `destination`; otros usuarios usan particiones distintas.

```text
ausente --POST válido--> guardado (201, created=true)
guardado --POST mismo destino--> guardado (200, created=false)
guardado --POST otro destino--> guardado con destination actualizado (200, created=false)
```

## Errores

| HTTP | Código | Situación |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body, destino o set inválido. |
| 401 | `UNAUTHENTICATED` | No hay JWT válido con `sub`. |
| 500 | `INTERNAL_ERROR` | Falla segura de persistencia. |

Los errores nunca incluyen token, claims, claves de DynamoDB, body completo ni detalles AWS.
