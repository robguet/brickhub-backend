# Data Model: List Saved Sets

## AuthenticatedUser

| Field | Type | Rule |
|---|---|---|
| `sub` | string | Required, non-empty, and sourced only from the validated JWT claim. It is never accepted through a request body, path, or query parameter. |

## Persisted Saved Set

| Field | Type | Rule |
|---|---|---|
| `PK` | string | Internal key: `USER#<sub>`. It scopes every query to the authenticated user. |
| `SK` | string | Internal key: `SAVED_SET#<setID>`. It identifies one saved-set snapshot within the user's partition. |
| `entityType` | string | Internal discriminator: `SAVED_SET`. |
| `destination` | enum | Exactly `collection` or `wishlist`; it determines the response array. |
| `set` | SetSnapshotInput | The validated stored catalog snapshot. |
| `createdAt` | UTC timestamp | The original creation time. |
| `updatedAt` | UTC timestamp | The most recent save or destination-change time. |

The natural identity is `(sub, setID)`. A saved set has exactly one destination and therefore appears in exactly one list for its owner.

## SetSnapshotInput

The list operation returns the snapshot fields already accepted by the save-set contract. Required fields are `setID`, `number`, `numberVariant`, `name`, `year`, `theme`, `category`, `released`, and `pieces`. Optional fields are `subtheme`, launch and exit dates, images, Brickset URL, ratings and counts, packaging type, EAN barcode, and last-updated timestamp. The full schema is defined in [openapi.yaml](contracts/openapi.yaml).

## SavedSetsList

| Field | Type | Rule |
|---|---|---|
| `collection` | `SavedSet[]` | Always present. Contains only authenticated-owner records with `destination = collection`. |
| `wishlist` | `SavedSet[]` | Always present. Contains only authenticated-owner records with `destination = wishlist`. |

`SavedSet` is the public projection `{ destination, set, createdAt, updatedAt }`. Internal keys, owner identity, `entityType`, and the POST-only `created` flag are never returned.

## Retrieval flow

```text
valid JWT sub
  -> query USER#<sub> and SAVED_SET# prefix (all pages)
  -> validate public destination classification
  -> collection[] and wishlist[]
  -> HTTP 200 success envelope
```

An empty result, or records in one destination only, produces a successful result with empty arrays where appropriate. Missing authentication produces `401 UNAUTHENTICATED`; retrieval failure produces `500 INTERNAL_ERROR` without storage details.
