---

description: "Implementation tasks for listing authenticated saved sets"
---

# Tasks: List Saved Sets

**Input**: Design documents from `/specs/006-list-saved-sets/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/openapi.yaml](contracts/openapi.yaml), [quickstart.md](quickstart.md)

**Tests**: Required by the project constitution. Write the listed tests before their corresponding behavior and confirm they fail for the intended missing behavior before implementation.

**Organization**: Tasks are grouped by user story so each scenario remains independently testable.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Extend the existing saved-set resource without creating a new service or data store.

- [X] T001 [P] Add the protected `GET /v1/saved-sets` event and only `dynamodb:Query` to `SaveUserSetFunction` in `template.yaml`, retaining `CognitoJwtAuthorizer`, the current table ARN, and existing write actions.
- [X] T002 [P] Add explicit `SavedSetsList` result types and a `list(user: AuthenticatedUser)` repository port in `src/modules/saved-sets/saved-set.types.ts`; require `collection` and `wishlist` as `SavedSet[]` arrays and keep internal persistence fields out of the public type.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Confirm the baseline and make the shared type and infrastructure work available before story-specific behavior.

- [X] T003 Run the pre-change validation baseline from `specs/006-list-saved-sets/quickstart.md` and record any existing failures before changing `src/modules/saved-sets/` or `template.yaml`.

**Checkpoint**: The GET event, least-privilege permission, and typed list boundary are ready; story work can proceed.

---

## Phase 3: User Story 1 - View my saved set lists (Priority: P1) 🎯 MVP

**Goal**: An authenticated user retrieves their saved snapshots grouped into collection and wishlist lists.

**Independent Test**: Seed a fake repository with one authenticated user's records in both destinations, call GET with that user's JWT claim, and verify HTTP 200 has each public saved set only in its matching array.

### Tests for User Story 1

- [X] T004 [P] [US1] Extend `tests/contract/saved-sets.contract.test.ts` to assert the `GET /v1/saved-sets` contract in `specs/006-list-saved-sets/contracts/openapi.yaml`, bearer JWT security, 200 `collection`/`wishlist` arrays, the SAM GET event, and `dynamodb:Query` least privilege.
- [X] T005 [P] [US1] Add repository tests in `tests/unit/modules/saved-sets/dynamodb-saved-set.repository.test.ts` for a `QueryCommand` scoped to `PK = USER#<sub>` and `begins_with(SK, SAVED_SET#)`, grouping valid `collection` and `wishlist` snapshots, and excluding `PK`, `SK`, and `entityType` from results.
- [X] T006 [P] [US1] Add service and controller tests in `tests/unit/modules/saved-sets/saved-sets.service.test.ts` and `tests/unit/modules/saved-sets/saved-sets.controller.test.ts` for a 200 `{ status: "success", data: { collection, wishlist } }` envelope containing each stored snapshot field and no POST-only `created` field.
- [X] T007 [P] [US1] Add a GET journey to `tests/integration/handlers/save-user-set.test.ts` that uses only `requestContext.authorizer.jwt.claims.sub`, verifies two-destination grouping for one user, and confirms the response has no internal key or owner fields.

### Implementation for User Story 1

- [X] T008 [US1] Implement the typed authenticated-partition query and public `SavedSet` projection in `src/modules/saved-sets/dynamodb-saved-set.repository.ts`; use DynamoDB Query rather than Scan, key condition `PK = USER#<sub>` plus the `SAVED_SET#` prefix, and ignore records whose persisted destination is not exactly `collection` or `wishlist`.
- [X] T009 [US1] Implement `list(user)` delegation in `src/modules/saved-sets/saved-sets.service.ts` without accepting a user identity from HTTP input.
- [X] T010 [US1] Add the successful GET response mapping in `src/modules/saved-sets/saved-sets.controller.ts` using the established success envelope and only public saved-set fields.
- [X] T011 [US1] Dispatch GET to the list controller in `src/modules/saved-sets/saved-sets.route.ts` after the existing authenticated-user check, while preserving POST behavior and the existing unknown-route response.

**Checkpoint**: User Story 1 returns correctly grouped saved sets for a valid authenticated user.

---

## Phase 4: User Story 2 - Receive empty lists when no sets are saved (Priority: P2)

**Goal**: A valid request succeeds with two usable arrays even when the authenticated user has no records or records in only one destination.

**Independent Test**: Configure the repository with no records and then with records from one destination only; each GET response must remain HTTP 200 and include both arrays, empty where appropriate.

### Tests for User Story 2

- [X] T012 [US2] Add empty-result and single-destination cases to `tests/unit/modules/saved-sets/dynamodb-saved-set.repository.test.ts` and `tests/integration/handlers/save-user-set.test.ts`, asserting both arrays are always present and that a Query result with no `Items` is not an error.

### Implementation for User Story 2

- [X] T013 [US2] Update `src/modules/saved-sets/dynamodb-saved-set.repository.ts` to initialize both arrays before reading query output and continue querying every `LastEvaluatedKey` page so all saved sets are returned while empty and one-destination results retain the two-array shape.

**Checkpoint**: User Story 2 succeeds without special client handling for empty or partial saved-set lists.

---

## Phase 5: User Story 3 - Protect saved sets from other users (Priority: P3)

**Goal**: Only a valid authenticated owner can retrieve their saved sets, and failures are safe.

**Independent Test**: Invoke GET with missing or blank `sub`, two distinct user subjects, and a repository failure; verify 401 has no repository call, successful data remains owner-scoped, and failure returns the public 500 envelope.

### Tests for User Story 3

- [X] T014 [US3] Add missing/blank authenticated-subject and two-user isolation GET cases to `tests/integration/handlers/save-user-set.test.ts`, proving unauthenticated requests do not call persistence and each valid subject sees only its own fake repository data.
- [X] T015 [US3] Add a repository-failure test to `tests/unit/modules/saved-sets/saved-sets.controller.test.ts` that requires HTTP 500 with `INTERNAL_ERROR` and verifies no AWS error, token, claim, internal key, or stack-trace detail appears in the body.

### Implementation for User Story 3

- [X] T016 [US3] Ensure `src/modules/saved-sets/saved-sets.route.ts` rejects GET before controller or repository access when `authenticatedUserFromEvent` has no non-empty `sub`, and ensure `src/modules/saved-sets/saved-sets.controller.ts` converts list failures to the established safe 500 `INTERNAL_ERROR` envelope.

**Checkpoint**: User Story 3 preserves Bearer-authentication and cross-user isolation guarantees for the GET operation.

---

## Phase 6: Polish & Cross-Cutting Validation

**Purpose**: Verify all feature artifacts and code meet project quality gates without deployment.

- [X] T017 Run `npm run typecheck`, `npm run lint`, and `npm test` from the repository root, resolving failures in `src/modules/saved-sets/`, `tests/`, or `template.yaml` without weakening the contract or test assertions.
- [X] T018 Run `sam validate --lint` and `sam build` from the repository root, confirming `template.yaml` packages the protected GET event and that no deployment is performed.
- [X] T019 Re-run the automated portion of `specs/006-list-saved-sets/quickstart.md` and verify the delivered behavior against `specs/006-list-saved-sets/contracts/openapi.yaml` and `specs/006-list-saved-sets/data-model.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately. T001 and T002 may run in parallel.
- **Foundational (Phase 2)**: T003 follows setup and must be understood before story behavior is changed.
- **User Story 1 (Phase 3)**: Depends on T001–T003. It is the MVP.
- **User Story 2 (Phase 4)**: Depends on the list repository and GET route from User Story 1.
- **User Story 3 (Phase 5)**: Depends on GET routing and controller behavior from User Story 1; it may be implemented alongside User Story 2 once those foundations exist.
- **Polish (Phase 6)**: Depends on all selected story phases.

### User Story Dependencies

- **US1 (P1)**: No dependency on another user story after the setup and baseline phases.
- **US2 (P2)**: Extends US1's list result to verify all empty-state and multi-page behavior.
- **US3 (P3)**: Extends US1's GET route to verify authorization and safe retrieval failures.

## Parallel Opportunities

- T001 and T002 modify different files and can run in parallel.
- After T002, T004–T007 can be written in parallel because they target different contract, repository, unit, and integration files.
- After User Story 1's shared GET behavior exists, T012 and T014 can be worked in parallel; they target different acceptance concerns, but their shared integration test file must be edited sequentially.
- T017 and T018 may run in parallel after implementation; T019 follows their successful results.

## Parallel Example: User Story 1

```text
Task: "T004 Contract coverage in tests/contract/saved-sets.contract.test.ts"
Task: "T005 Repository coverage in tests/unit/modules/saved-sets/dynamodb-saved-set.repository.test.ts"
Task: "T006 Service/controller coverage in tests/unit/modules/saved-sets/saved-sets.service.test.ts and tests/unit/modules/saved-sets/saved-sets.controller.test.ts"
Task: "T007 GET journey in tests/integration/handlers/save-user-set.test.ts"
```

## Implementation Strategy

### MVP First

1. Complete T001–T003.
2. Complete User Story 1 through T011.
3. Validate the User Story 1 independent test before continuing.

### Incremental Delivery

1. Add User Story 2 to guarantee empty-list and complete-query behavior.
2. Add User Story 3 to prove authorization isolation and safe internal failures.
3. Complete quality gates in T017–T019. Do not deploy without separate explicit approval.
