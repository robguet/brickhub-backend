# Research: List Saved Sets

## Resource and route

**Decision**: Add `GET /v1/saved-sets` to the existing saved-set resource while retaining its existing `POST` operation.

**Rationale**: The resource already owns per-user catalog snapshots whose exclusive `destination` is `collection` or `wishlist`. The physical collection resource represents a different domain (owned instances, quantities, and condition), so extending it would blur responsibilities.

**Alternatives considered**: A separate list Lambda would duplicate the saved-set module, configuration, and log group without a new domain boundary. Two destination-specific routes would duplicate authorization and grouping behavior.

## Authentication and ownership

**Decision**: Apply the existing Cognito JWT authorizer in SAM and derive the owner only from `requestContext.authorizer.jwt.claims.sub` through the existing authentication helper.

**Rationale**: This is the established private-route boundary. It ensures a Bearer credential is verified before the route executes and prevents any client-supplied user identity from selecting the data partition.

**Alternatives considered**: Parsing or validating the Authorization header in Lambda duplicates the API authorizer and risks handling token data unnecessarily. A `userId` request field would enable cross-user access attempts.

## Retrieval and grouping

**Decision**: Query `PK = USER#<sub>` with an `SK` prefix of `SAVED_SET#`, follow all DynamoDB query pages, and group only valid `SAVED_SET` records into `collection` and `wishlist` arrays.

**Rationale**: The existing key design guarantees user partitioning and one stored record per `(sub, setID)`. A key-constrained query returns only that user's saved sets and avoids a table scan. Iterating pages fulfills the requirement to return all saved sets without adding client-visible pagination. Defensive omission of malformed or unsupported destinations prevents corrupt records from being exposed in either list.

**Alternatives considered**: A DynamoDB Scan or an unscoped destination filter would violate data isolation and scale poorly. Returning only the first query page could omit saved sets. A new index is unnecessary because the base partition and sort-key prefix already support the access pattern.

## Response and error contract

**Decision**: Return HTTP 200 using the established success envelope: `{ status: "success", data: { collection: [], wishlist: [] } }`, populated with public saved-set fields only. Return safe `401 UNAUTHENTICATED` and `500 INTERNAL_ERROR` error envelopes when applicable.

**Rationale**: Both arrays are always present, allowing an empty saved-set state to be represented as a successful result. Reusing the current envelope maintains iOS contract consistency, and excluding `PK`, `SK`, `entityType`, claims, and other internal fields prevents data leakage.

**Alternatives considered**: Null or omitted lists require special client logic. Returning storage records directly would expose internal implementation details.

## Infrastructure, IAM, and verification

**Decision**: Add a protected GET event to `SaveUserSetFunction` and add only `dynamodb:Query` to its existing DynamoDB actions. Extend existing unit, integration, and contract tests.

**Rationale**: Query is the sole additional DynamoDB action needed. Existing test conventions use injected repositories and contract text checks, providing verification without AWS resources.

**Alternatives considered**: Broad DynamoDB permissions fail least privilege. Testing against a live AWS table would make unit tests non-deterministic and violate project quality rules.
