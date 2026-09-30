# Tasks: Protect Set Search

**Input**: Design documents from `/specs/004-protect-set-search/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/openapi.yaml](contracts/openapi.yaml), [quickstart.md](quickstart.md)

**Tests**: Required by the project constitution. Tests are repository-only and must not call Cognito, API Gateway, Secrets Manager, Brickset, or DynamoDB.

**Organization**: Tasks are grouped by user story after the shared gateway authentication change that blocks anonymous requests.

## Phase 1: Setup

**Purpose**: Confirm the existing authorization building blocks that this feature reuses.

- [X] T001 Review the existing `CognitoJwtAuthorizer` and `SearchSets` event in `template.yaml` against `specs/004-protect-set-search/research.md` before changing the route.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Bind the existing API Gateway JWT authorizer to the search route; this is required before authenticated search can work.

**⚠️ CRITICAL**: Complete this phase before validating either user story.

- [X] T002 Add a failing route-infrastructure assertion in `tests/contract/cognito-collection.contract.test.ts` that `SearchSets` requires `CognitoJwtAuthorizer` without custom scopes, without asserting or recording tokens.
- [X] T003 Configure the `SearchSets` `HttpApi` event in `template.yaml` with `Auth: { Authorizer: CognitoJwtAuthorizer }` so API Gateway denies unauthenticated requests before the Lambda runs.

**Checkpoint**: Gateway authorization is declared and covered by a regression assertion; user-story contract work can proceed.

---

## Phase 3: User Story 1 - Search with an authorized session (Priority: P1) 🎯 MVP

**Goal**: A valid Bearer access token preserves the current catalog-search response.

**Independent Test**: Static contract tests confirm `/v1/sets` declares Bearer security without custom scopes; the existing authenticated search success response remains `200` with `status`, `matches`, and `sets`.

- [X] T004 [P] [US1] Add contract assertions for `GET /v1/sets` Bearer JWT security without custom scopes and the unchanged `200` search envelope in `tests/contract/sets.contract.test.ts`.
- [X] T005 [US1] Update `specs/001-search-brickset-sets/contracts/openapi.yaml` to declare `CognitoAccessToken` Bearer JWT security without custom scopes, preserving all existing query parameters and the successful response schema.

**Checkpoint**: An authorized iOS access token is documented and enforced as the prerequisite for the established search response.

---

## Phase 4: User Story 2 - Reject unauthenticated searches (Priority: P1)

**Goal**: Missing, malformed, expired, or untrusted Bearer credentials safely deny catalog search.

**Independent Test**: The public contract documents `401` for missing/invalid Bearer credentials; the infrastructure assertion confirms these callers never invoke the search Lambda.

- [X] T006 [P] [US2] Extend `tests/contract/sets.contract.test.ts` with assertions for the documented `401` response and for the absence of token, authorization-header, and provider-secret fields in the error schema.
- [X] T007 [US2] Add a safe `401` error response to `specs/001-search-brickset-sets/contracts/openapi.yaml`, keeping the established `{ status, code, message }` error envelope and excluding credential or validation internals.

**Checkpoint**: The contract distinguishes authentication from authorization failures without leaking sensitive details or catalog data.

---

## Phase 5: Polish & Cross-Cutting Verification

**Purpose**: Verify infrastructure, contract consistency, and safe behavior without contacting AWS.

- [X] T008 Reconcile the implementation-facing contract in `specs/001-search-brickset-sets/contracts/openapi.yaml` with the feature contract in `specs/004-protect-set-search/contracts/openapi.yaml`, ensuring the route, Bearer scheme, no-custom-scope policy, `401`, success, and error schemas match.
- [X] T009 Run `npm run typecheck`, `npm run lint`, `npm test`, `sam validate --lint`, and `sam build`; record failures without deploying or calling real AWS resources in `specs/004-protect-set-search/quickstart.md` only if instructions need clarification.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on T001 and blocks both user stories.
- **User Story 1 (Phase 3)**: Depends on T003.
- **User Story 2 (Phase 4)**: Depends on T003; its shared test file must follow T004/T005 to avoid edit conflicts.
- **Polish (Phase 5)**: Depends on T005 and T007.

### User Story Dependencies

- **US1**: Starts after the shared gateway binding is complete and is independently testable through its contract test and unchanged success schema.
- **US2**: Starts after the shared gateway binding is complete. It is logically independent of authorized-result behavior, but its test shares `tests/contract/sets.contract.test.ts` with US1, so perform it after US1 to avoid file conflicts.

### Parallel Opportunities

- T004 and the preparation for T006 are conceptually independent test concerns, but both edit `tests/contract/sets.contract.test.ts`; execute them sequentially.
- The `[P]` labels denote tasks that can run alongside work in different files once their stated prerequisites are complete.

## Parallel Example: User Story 1

```text
Task: "Add contract assertions for Bearer JWT security and the unchanged 200 envelope in tests/contract/sets.contract.test.ts"
Task: "Review the existing SearchSets route binding in template.yaml for the required scope"
```

The first task may begin after the foundational route-binding decision is known; do not edit the same contract file concurrently with US2.

## Implementation Strategy

### MVP First

1. Complete T001–T003 to enforce gateway authorization.
2. Complete T004–T005 and run the focused contract test for US1.
3. Confirm an authorized caller retains the existing search contract before adding failure documentation.

### Incremental Delivery

1. The foundational phase makes the endpoint private at the infrastructure boundary.
2. US1 preserves the successful authenticated search contract.
3. US2 documents safe unauthenticated and unauthorized failures.
4. Final verification proves the repository changes without a deployment.

## Notes

- Every task uses the required checklist format, exact file paths, and an execution-order ID.
- Custom Cognito scopes are intentionally omitted; a valid BrickHub Bearer token is sufficient for the protected routes.
- No task sends a Brickset key, AWS secret, token, or authorization header to logs, specs, fixtures, or the iOS client.
