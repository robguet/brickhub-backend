---
description: "Task list for deleting a saved LEGO set"
---

# Tasks: Eliminar set guardado

**Input**: Design documents from `/specs/007-delete-saved-set/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/openapi.yaml`, and `quickstart.md`

**Tests**: Included because the project constitution requires unit and handler/controller tests for every feature, plus contract and infrastructure validation.

**Organization**: Tasks are grouped by user story. The three stories share one endpoint; US1 delivers the deletion flow, while US2 and US3 add focused isolation and authentication guarantees.

## Phase 1: Setup

**Purpose**: Confirm the existing TypeScript, SAM, saved-sets module, and Vitest structure is the target for this feature.

No project initialization or dependency changes are needed; the implementation uses the existing project configuration.

---

## Phase 2: Foundational

**Purpose**: Add the deletion operation to the shared saved-set repository boundary before story-specific behavior is implemented.

- [X] T001 Add `delete(user: AuthenticatedUser, setID: number): Promise<boolean>` to `SavedSetRepository` in `src/modules/saved-sets/saved-set.types.ts` and add the corresponding method to existing repository test doubles in `tests/unit/modules/saved-sets/saved-sets.service.test.ts`, `tests/unit/modules/saved-sets/saved-sets.controller.test.ts`, and `tests/integration/handlers/save-user-set.test.ts`.

**Checkpoint**: The module boundary can express an owner-scoped saved-set deletion; all existing typed test doubles satisfy the expanded interface.

---

## Phase 3: User Story 1 - Eliminar uno de mis sets guardados (Priority: P1) 🎯 MVP

**Goal**: Let an authenticated user delete one saved set from either destination and receive a consistent confirmation.

**Independent Test**: Save a set for a user, issue the authenticated DELETE for its `setID`, confirm HTTP 200 with `{ setID, deleted: true }`, and verify that only the selected set is removed from that user's saved-set lists.

### Tests for User Story 1

- [X] T002 [P] [US1] Add OpenAPI and SAM contract assertions for `DELETE /v1/saved-sets/{setID}`, Bearer security, 200/400/401/404/500 responses, and `dynamodb:DeleteItem` in `tests/contract/saved-sets.contract.test.ts`.
- [X] T003 [P] [US1] Add controller tests for positive-integer ID validation, the successful `{ setID, deleted: true }` envelope, and safe 400/500 responses in `tests/unit/modules/saved-sets/saved-sets.controller.test.ts`.
- [X] T004 [P] [US1] Add service delegation coverage proving the authenticated user and numeric `setID` reach the repository in `tests/unit/modules/saved-sets/saved-sets.service.test.ts`.
- [X] T005 [P] [US1] Add handler integration coverage for successful deletion from both `collection` and `wishlist`, plus preservation of other saved sets, in `tests/integration/handlers/save-user-set.test.ts`.
- [X] T006 [P] [US1] Add DynamoDB repository coverage for deleting a saved-set key and returning `true` on success in `tests/unit/modules/saved-sets/dynamodb-saved-set.repository.test.ts`.

### Implementation for User Story 1

- [X] T007 [P] [US1] Define a positive-integer saved-set path parameter schema for `setID` in `src/modules/saved-sets/saved-set.schemas.ts`.
- [X] T008 [US1] Implement service delegation for `delete(user, setID)` in `src/modules/saved-sets/saved-sets.service.ts`.
- [X] T009 [US1] Implement conditional `DeleteCommand` using `PK = USER#<sub>`, `SK = SAVED_SET#<setID>`, and `entityType = SAVED_SET`; return `false` for `ConditionalCheckFailedException` in `src/modules/saved-sets/dynamodb-saved-set.repository.ts`.
- [X] T010 [US1] Implement controller validation and map deletion success to HTTP 200 `{ setID, deleted: true }`, invalid IDs to 400 `VALIDATION_ERROR`, and unexpected failures to a safe 500 `INTERNAL_ERROR` in `src/modules/saved-sets/saved-sets.controller.ts`.
- [X] T011 [US1] Keep the authenticated-user guard ahead of method dispatch and pass `event.pathParameters?.setID` to the controller for DELETE requests in `src/modules/saved-sets/saved-sets.route.ts`.
- [X] T012 [US1] Add the Cognito-protected DELETE event at `/v1/saved-sets/{setID}` and grant only `dynamodb:DeleteItem` in the existing saved-set function policy in `template.yaml`.
- [X] T013 [US1] Document the DELETE path parameter, Bearer security, response envelopes, and status codes in `specs/007-delete-saved-set/contracts/openapi.yaml`.

**Checkpoint**: An authenticated owner can delete one set from either list, and invalid identifiers or unexpected failures receive safe public responses.

---

## Phase 4: User Story 2 - Mantener el aislamiento entre cuentas (Priority: P2)

**Goal**: Ensure an authenticated user can only delete a saved-set record in their own partition, with no disclosure of another account's record.

**Independent Test**: Save the same `setID` for two users, delete it as one user, and confirm the other user's record remains; verify nonexistent and inaccessible records produce the same 404 response.

### Tests for User Story 2

- [X] T014 [P] [US2] Verify the delete command derives its partition from the authenticated `sub`, constrains the sort key to `SAVED_SET#<setID>`, requires `entityType = SAVED_SET`, and maps conditional failure to `false` in `tests/unit/modules/saved-sets/dynamodb-saved-set.repository.test.ts`.
- [X] T015 [P] [US2] Add integration coverage proving a user cannot remove another user's matching `setID` and receives the same 404 envelope as for a missing record in `tests/integration/handlers/save-user-set.test.ts`.

### Implementation for User Story 2

- [X] T016 [US2] Ensure not-found results from the repository become 404 `RESOURCE_NOT_FOUND` without exposing owner or storage details in `src/modules/saved-sets/saved-sets.controller.ts`.

**Checkpoint**: A delete only affects the authenticated user's `SAVED_SET` record; missing, repeated, wrong-type, and inaccessible records share the same public 404 behavior.

---

## Phase 5: User Story 3 - Rechazar eliminaciones sin autenticación válida (Priority: P3)

**Goal**: Reject requests that do not have an authenticated Cognito identity before any deletion reaches the repository.

**Independent Test**: Invoke the route with no usable authenticated `sub` and verify it returns 401 without calling the repository; confirm the SAM event uses the Cognito JWT authorizer.

### Tests for User Story 3

- [X] T017 [P] [US3] Add handler integration cases for missing and blank authenticated `sub`, verifying 401 `UNAUTHENTICATED` and zero repository deletion calls in `tests/integration/handlers/save-user-set.test.ts`.
- [X] T018 [P] [US3] Assert the DELETE SAM event requires `CognitoJwtAuthorizer` and the contract declares the Bearer JWT security scheme in `tests/contract/saved-sets.contract.test.ts`.

**Checkpoint**: Requests without a valid authenticated identity cannot invoke saved-set deletion.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the full implementation against the project gates and feature quickstart.

- [X] T019 Run the automated validation commands listed in `specs/007-delete-saved-set/quickstart.md` and resolve any typecheck, lint, test, SAM validation, or build failures in the affected implementation and test files.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No work; the existing project configuration is reused.
- **Foundational (Phase 2)**: T001 expands the saved-set repository port and updates existing typed test doubles; all story phases depend on it.
- **User Stories (Phases 3–5)**: Execute in priority order. US2 and US3 depend on the endpoint and authenticated route created in US1, then add their specific isolation and authentication coverage.
- **Polish (Phase 6)**: Depends on the desired user stories being implemented.

### User Story Dependencies

- **US1 (P1)**: Starts after T001; delivers the endpoint's main behavior and can be demonstrated independently.
- **US2 (P2)**: Depends on US1's owner-scoped deletion implementation; adds assurance that foreign and missing records are indistinguishable and unaffected.
- **US3 (P3)**: Depends on US1's DELETE route; confirms the shared authentication guard protects the new method.

### Within Each User Story

- Add the focused tests before implementation.
- Keep path validation at the controller boundary, business delegation in the service, and DynamoDB operations in the repository.
- Configure the SAM route with the same Cognito authorizer used by the saved-set GET and POST operations.
- Map storage conditional failures to the public not-found response without a pre-read.

### Parallel Opportunities

- In US1, T002 through T006 touch distinct contract, controller, service, integration, and repository test files and can be prepared in parallel after T001.
- In US1, T007 and the independent SAM/OpenAPI contract changes T012–T013 can be prepared in parallel; service, repository, controller, and route implementation tasks depend on their respective preceding layers.
- In US2, T014 and T015 touch separate repository-unit and handler-integration test files and can run in parallel.
- In US3, T017 and T018 touch separate integration and contract test files and can run in parallel.

---

## Parallel Example: User Story 1

```text
Task: T002 OpenAPI/SAM contract assertions in tests/contract/saved-sets.contract.test.ts
Task: T003 Controller behavior tests in tests/unit/modules/saved-sets/saved-sets.controller.test.ts
Task: T004 Service delegation test in tests/unit/modules/saved-sets/saved-sets.service.test.ts
Task: T005 Handler integration coverage in tests/integration/handlers/save-user-set.test.ts
Task: T006 DynamoDB repository tests in tests/unit/modules/saved-sets/dynamodb-saved-set.repository.test.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete T001, then implement Phase 3.
2. Validate the successful owner deletion, invalid identifier, and safe server-error behavior.
3. The MVP is complete when the protected route removes exactly one matching saved-set record and confirms it using the documented envelope.

### Incremental Delivery

1. Deliver US1 for the authenticated deletion flow.
2. Add US2 checks for account isolation and indistinguishable not-found responses.
3. Add US3 checks for authentication rejection before repository access.
4. Complete T019 against the quickstart and project quality gates.

## Notes

- `[P]` marks tasks that touch separate files and do not depend on each other after their stated phase prerequisites.
- `[US1]`, `[US2]`, and `[US3]` map directly to the user stories in `specs/007-delete-saved-set/spec.md`.
- Every task includes at least one exact repository-relative file path.
- The successful operation removes the whole saved-set record, regardless of its existing `destination`.
