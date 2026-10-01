# Research: Eliminar set guardado

## Resource and route

**Decision**: Add `DELETE /v1/saved-sets/{setID}` to the existing saved-set resource.

**Rationale**: Saved catalog snapshots already belong to the `saved-sets` module and are uniquely stored as `SAVED_SET#<setID>` for a user. The physical collection resource represents separately tracked owned instances, quantities, and condition, so it is a different domain.

**Alternatives considered**: A separate Lambda duplicates the module, API configuration, and log group without a new boundary. A collection route would couple two different models. A destination-specific route is unnecessary because a saved set has exactly one destination and its identity is `(sub, setID)`.

## Authentication and ownership

**Decision**: Apply the existing API Gateway Cognito JWT authorizer and derive the owner only from `requestContext.authorizer.jwt.claims.sub` through the existing authentication helper.

**Rationale**: This is the current private-route boundary and prevents a request path, body, or query field from selecting a different owner's partition. The Lambda independently rejects events that lack a usable `sub`.

**Alternatives considered**: Parsing the Authorization header in Lambda duplicates token validation and unnecessarily handles credentials. A client-supplied user ID would permit cross-user deletion attempts.

## Atomic deletion and non-disclosure

**Decision**: Delete the exact key `PK = USER#<authenticated-sub>`, `SK = SAVED_SET#<setID>` with a condition requiring both key attributes and `entityType = SAVED_SET`. Convert a conditional failure to the same not-found result used for an inaccessible or nonexistent record.

**Rationale**: The condition prevents deleting a different entity type sharing a key and avoids a read-then-delete race. Because the partition key is always derived from the caller, a set saved only by another account cannot be reached. Returning the same 404 for missing, deleted, malformed-type, and another user's set avoids ownership disclosure.

**Alternatives considered**: A prior read adds a race and could leak whether the record exists. A table scan or unscoped deletion violates isolation and least privilege. Soft deletion adds state and query complexity not required by the specification.

## Validation and response contract

**Decision**: Validate `setID` as a positive integer path parameter, accept no request body, and return HTTP 200 with `{ status: "success", data: { setID, deleted: true } }`. Return standard 400, 401, 404, and 500 error envelopes where applicable.

**Rationale**: The saved-set key uses numeric `setID`; validating it before persistence prevents malformed keys. HTTP 200 retains BrickHub's uniform JSON success envelope while making the removed resource explicit. The common 404 preserves privacy for inaccessible records.

**Alternatives considered**: Accepting an arbitrary string can produce ambiguous keys. HTTP 204 would not provide the product's standard confirmation envelope. Returning 403 for another user's set confirms its existence.

## Infrastructure, IAM, and verification

**Decision**: Add a Cognito-protected DELETE event to the existing `SaveUserSetFunction` and append only `dynamodb:DeleteItem` to its DynamoDB actions. Add unit, handler-integration, and contract/SAM tests.

**Rationale**: `DeleteItem` is the sole extra DynamoDB operation. Existing test conventions inject repositories and assert contract text, allowing deterministic validation without AWS resources.

**Alternatives considered**: Broad DynamoDB permissions fail least privilege. A live-table test would be non-deterministic and outside the unit test boundary.

## Concurrent mutation behavior

**Decision**: Confirm the mutation that completes atomically at delete time; repeating a delete without a later save returns not found.

**Rationale**: The current model has no client version or ordering mechanism. A save that completes after a successful delete may intentionally create the record again, which is consistent with independent save and delete operations.

**Alternatives considered**: Adding version fields or transactional coordination would expand the data model and client contract without a stated concurrency requirement.
