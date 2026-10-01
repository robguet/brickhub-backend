# Data Model: Eliminar set guardado

## AuthenticatedUser

| Field | Type | Rule |
|---|---|---|
| `sub` | string | Required, non-empty, and sourced only from the validated JWT claim. It is never accepted through a path, query parameter, or request body. |

## Persisted Saved Set

| Field | Type | Rule |
|---|---|---|
| `PK` | string | Internal key: `USER#<sub>`. It is formed exclusively from `AuthenticatedUser.sub`. |
| `SK` | string | Internal key: `SAVED_SET#<setID>`. It identifies one saved-set snapshot within the owner's partition. |
| `entityType` | string | Internal discriminator: `SAVED_SET`; it is required by the delete condition. |
| `destination` | enum | Existing exclusive value: `collection` or `wishlist`. It is removed with the record. |
| `set` | SetSnapshotInput | Existing validated catalog snapshot. It is removed with the record. |
| `createdAt` | UTC timestamp | Existing creation time. It is removed with the record. |
| `updatedAt` | UTC timestamp | Existing update time. It is removed with the record. |

The natural identity is `(sub, setID)`. There is at most one saved-set record per identity; destination does not form part of the deletion identifier.

## DeleteSavedSetInput

| Field | Location | Type | Rule |
|---|---|---|---|
| `setID` | path | integer | Required positive integer. Invalid, zero, negative, fractional, or non-numeric values are rejected before persistence. |

The operation has no request body. It does not accept `sub`, `userId`, `destination`, `PK`, `SK`, `entityType`, or set metadata.

## Delete result

| Result | HTTP status | Public response |
|---|---|---|
| Matching owned saved set deleted | 200 | `{ status: "success", data: { setID, deleted: true } }` |
| Invalid `setID` | 400 | Safe `VALIDATION_ERROR` envelope |
| Missing or invalid authentication | 401 | Safe `UNAUTHENTICATED` envelope |
| No matching owned `SAVED_SET` record | 404 | Safe `RESOURCE_NOT_FOUND` envelope |
| Unexpected persistence failure | 500 | Safe `INTERNAL_ERROR` envelope |

## State transition

```text
saved (collection or wishlist)
  -- DELETE with matching authenticated owner and setID --> nonexistent
```

The repository executes this as one conditional mutation. A record belonging to another owner is unreachable because its partition key differs. A missing record, a record of another type, a repeated deletion, and an inaccessible record all produce the same public not-found outcome; no internal key, owner identity, set snapshot, or DynamoDB detail is exposed.
