# Tasks: Colección LEGO del usuario

**Input**: Diseño de `specs/002-user-lego-collection/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/openapi.yaml`, `quickstart.md`

**Tests**: Obligatorios por la constitución: pruebas unitarias de servicios, controller/handler, contrato y aislamiento sin recursos AWS reales.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar dependencias y estructura sin cambiar el contrato existente de catálogo.

- [X] T001 [P] Add `@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb` to `package.json` for the DynamoDB repository.
- [X] T002 [P] Create the collection module directories declared in `src/modules/collection/` and test directories `tests/unit/modules/collection/`, `tests/integration/handlers/`, and `tests/contract/` without moving existing catalog files.
- [X] T003 [P] Add collection contract fixture references to `tests/contract/collection-sets.contract.test.ts` for `specs/002-user-lego-collection/contracts/openapi.yaml`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared typed boundaries, validation, safe response handling, and SAM parameters that all private routes need.

**⚠️ CRITICAL**: Complete this phase before implementing user-story routes.

- [X] T004 Create `src/modules/collection/collection-set.types.ts` with explicit domain DTOs, error codes, repository port, `AuthenticatedUser`, and fields constrained as: `catalogSetId` positive integer; `quantity` `1..99` default `1`; `condition` one of `sealed`, `new`, `used`, `incomplete` default `used`; trimmed `notes` max 1,000 or `null`; `acquiredOn` ISO `YYYY-MM-DD`, non-future, or `null`.
- [X] T005 [P] Create strict Zod request/path/query schemas in `src/modules/collection/collection-set.schemas.ts`; reject unknown fields including `sub`, `userId`, `ownerId`, require at least one update field, enforce `limit` `1..100` default `20`, and cursor max length 2,048.
- [X] T006 [P] Implement `src/shared/authenticated-user.ts` to extract and validate only the non-empty `requestContext.authorizer.jwt.claims.sub`, without accepting identity data from client input.
- [X] T007 [P] Extend `src/shared/http-response.ts` and its types to produce consistent collection success envelopes `{ status: "success", data }` and safe `400`, `401`, `404`, `409`, and `500` error envelopes without tokens, PII, stack traces, or DynamoDB details.
- [X] T008 [P] Add unit tests for Zod validation and authenticated-user extraction in `tests/unit/modules/collection/collection-set.schemas.test.ts` and `tests/unit/shared/authenticated-user.test.ts`, including forbidden owner fields and a missing `sub`.
- [X] T009 Add the collection DynamoDB table, non-sensitive resource parameters, least-privilege collection CRUD policy, retained Lambda Log Group, and outputs to `template.yaml`; ensure no `Scan` permission is granted.

**Checkpoint**: Typed and secure foundation ready; no private business endpoint is exposed yet.

---

## Phase 3: User Story 1 - Crear y acceder a mi cuenta (Priority: P1)

**Goal**: Permitir cuenta con correo verificado y acceso con correo/contraseña, Google o Apple desde el cliente iOS, produciendo access tokens de Cognito aptos para las rutas privadas.

**Independent Test**: Inspeccionar la infraestructura SAM y validar con una cuenta de desarrollo que correo sin confirmar no accede, mientras los tres métodos válidos emiten un token del mismo User Pool y cliente iOS.

- [X] T010 [P] [US1] Add infrastructure contract assertions in `tests/contract/cognito-collection.contract.test.ts` for email-required/verified User Pool, public iOS App Client, Google, Apple, authorization-code PKCE, callbacks, and no client secret.
- [X] T011 [P] [US1] Add a manual IdP configuration checklist and secure-secret setup instructions to `specs/002-user-lego-collection/quickstart.md`, naming required Google/Apple values but never placing their values in the repository.
- [X] T012 [US1] Define Cognito User Pool, verified email/password policy and recovery, Google/Apple `AWS::Cognito::UserPoolIdentityProvider` resources, User Pool domain, and public iOS App Client in `template.yaml`; source provider credentials through Secrets Manager references/parameters only.
- [X] T013 [US1] Define Cognito resource server scopes `lego-collection/sets.read` and `lego-collection/sets.write`, HTTP API JWT authorizer issuer/audience, and attach read/write authorization requirements for future collection routes in `template.yaml`.
- [X] T014 [US1] Run the US1 infrastructure contract test in `tests/contract/cognito-collection.contract.test.ts` and resolve all assertions before declaring authentication configuration complete.

**Checkpoint**: A verified or federated iOS user can receive a Cognito access token; private API routes are not yet implemented.

---

## Phase 4: User Story 2 - Consultar mi colección (Priority: P1)

**Goal**: Un usuario autenticado puede listar solo sus propios sets con paginación opaca.

**Independent Test**: Con fakes de repositorio y dos `sub` distintos, solicitar `GET /v1/collection/sets`; cada respuesta contiene solo la colección del solicitante, una colección vacía devuelve `200`, y el cursor no revela propietario.

- [X] T015 [P] [US2] Add GET response, `limit`/`cursor`, `401`, and safe-listing assertions to `tests/contract/collection-sets.contract.test.ts` using `specs/002-user-lego-collection/contracts/openapi.yaml`.
- [X] T016 [P] [US2] Write list use-case tests in `tests/unit/modules/collection/collection-sets.service.test.ts` for `sub`-scoped calls, default/maximum page limits, empty pages, opaque cursors, and invalid cursors.
- [X] T017 [P] [US2] Write GET handler/controller integration tests in `tests/integration/handlers/collection-sets.test.ts` for valid claims, missing `sub`, user A/B isolation, empty collection, and no `sub` in output.
- [X] T018 [US2] Implement `src/modules/collection/dynamodb-collection-set.repository.ts` list operation using `PK = USER#<sub>`, `SK` prefix `SET#`, DynamoDB `Query` only, descending UUIDv7 order, and a versioned cursor that contains only the last set identifier and rebuilds the exclusive key from the authenticated `sub`.
- [X] T019 [US2] Implement list orchestration in `src/modules/collection/collection-sets.service.ts` and the repository port in `src/modules/collection/collection-set.repository.ts`; return only public `CollectionSet` fields and never owner/internal keys.
- [X] T020 [US2] Implement GET validation, envelopes, and safe errors in `src/modules/collection/collection-sets.controller.ts` using the schemas from `src/modules/collection/collection-set.schemas.ts`.
- [X] T021 [US2] Add `src/modules/collection/collection-sets.route.ts` and `src/handlers/collection-sets.ts` to wire the GET route, inject `AuthenticatedUser`, and emit only structured, non-sensitive failure logs.
- [X] T022 [US2] Attach `GET /v1/collection/sets` to the JWT authorizer with `lego-collection/sets.read` in `template.yaml` and make the US2 contract, unit, and integration tests pass.

**Checkpoint**: Listing is independently deployable and proves collection isolation without creation endpoints.

---

## Phase 5: User Story 3 - Añadir un set a mi colección (Priority: P1)

**Goal**: Un usuario autenticado puede crear una instancia personal de un set sin controlar su propietario.

**Independent Test**: Crear un set válido como usuario A y listarlo como A; intentos con `userId`/`sub`, atributos inválidos o usuario B no alteran la propiedad ni exponen el registro.

- [X] T023 [P] [US3] Extend `tests/contract/collection-sets.contract.test.ts` with POST `201`, strict create body, `400`, `401`, and `lego-collection/sets.write` requirements from `contracts/openapi.yaml`.
- [X] T024 [P] [US3] Add creation use-case tests to `tests/unit/modules/collection/collection-sets.service.test.ts` for generated UUIDv7, service timestamps, defaults, public DTO mapping, and rejected invalid/owner-bearing input.
- [X] T025 [P] [US3] Add POST integration tests to `tests/integration/handlers/collection-sets.test.ts` that prove A ownership derives from claims rather than a supplied user field and B cannot see A's newly created set.
- [X] T026 [US3] Implement conditional DynamoDB create in `src/modules/collection/dynamodb-collection-set.repository.ts` with `PK = USER#<sub>`, `SK = SET#<collectionSetId>`, `entityType = COLLECTION_SET`, `destination = collection`, and `attribute_not_exists` condition; map collision without leaking existing data.
- [X] T027 [US3] Extend `src/modules/collection/collection-sets.service.ts` to generate UUIDv7, `createdAt`/`updatedAt`, apply create defaults, and persist with the authenticated user only.
- [X] T028 [US3] Extend `src/modules/collection/collection-sets.controller.ts`, `src/modules/collection/collection-sets.route.ts`, and `src/handlers/collection-sets.ts` for strict POST parsing, `201` success envelope, safe errors, and request-ID-only diagnostics.
- [X] T029 [US3] Attach `POST /v1/collection/sets` with `lego-collection/sets.write` in `template.yaml` and make all US3 contract, unit, and integration tests pass.

**Checkpoint**: Create plus list delivers a usable private collection MVP.

---

## Phase 6: User Story 4 - Corregir o eliminar un set de mi colección (Priority: P2)

**Goal**: Un usuario autenticado puede actualizar campos permitidos o borrar un set propio, sin revelar ni cambiar datos de terceros.

**Independent Test**: Crear un set de A, editarlo y borrarlo como A; ejecutar PATCH/DELETE con el mismo ID como B y con un ID inexistente, verificando la misma respuesta `404 RESOURCE_NOT_FOUND` y que A permanece intacto.

- [X] T030 [P] [US4] Extend `tests/contract/collection-sets.contract.test.ts` with PATCH/DELETE paths, immutable `catalogSetId`, non-empty update body, `200` delete envelope, and identical public `404` contract for missing/foreign sets.
- [X] T031 [P] [US4] Add update/delete use-case tests to `tests/unit/modules/collection/collection-sets.service.test.ts` for allowed fields, `notes`/`acquiredOn` null clearing, timestamp refresh, immutable ownership/catalog ID, and conditional failure mapping.
- [X] T032 [P] [US4] Add PATCH/DELETE integration tests to `tests/integration/handlers/collection-sets.test.ts` for A success, B foreign ID, missing ID, malformed ID, invalid body, and unchanged A data after B's request.
- [X] T033 [US4] Implement conditional update and delete in `src/modules/collection/dynamodb-collection-set.repository.ts`; use only `{ PK: USER#<authenticated sub>, SK: SET#<collectionSetId> }`, condition on `entityType`, map conditional failures identically to `404 RESOURCE_NOT_FOUND`, and never pre-read globally.
- [X] T034 [US4] Extend `src/modules/collection/collection-sets.service.ts` with whitelist update/delete operations that retain owner, `catalogSetId`, `destination`, and internal keys while updating `updatedAt` atomically.
- [X] T035 [US4] Extend `src/modules/collection/collection-sets.controller.ts`, `src/modules/collection/collection-sets.route.ts`, and `src/handlers/collection-sets.ts` for PATCH/DELETE validation, safe `404`, and `{ status: "success", data: { collectionSetId, deleted: true } }` deletion envelope.
- [X] T036 [US4] Attach PATCH and DELETE `/v1/collection/sets/{collectionSetId}` with `lego-collection/sets.write` in `template.yaml` and make all US4 contract, unit, and integration tests pass.

**Checkpoint**: All CRUD operations preserve owner isolation and foreign/nonexistent indistinguishability.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validate the feature as a secure, reproducible backend change.

- [X] T037 [P] Review `template.yaml` IAM, environment variables, Log Group retention, Cognito secret references, and API route authorizers against `specs/002-user-lego-collection/research.md` and remove any unnecessary permission or sensitive output.
- [X] T038 [P] Verify public envelopes and error-code semantics against `specs/002-user-lego-collection/contracts/openapi.yaml` in `tests/contract/collection-sets.contract.test.ts`, including absence of `sub`, JWTs, authorization headers, and DynamoDB details.
- [ ] T039 Execute every scenario in `specs/002-user-lego-collection/quickstart.md`, recording safe local evidence and ensuring no test suite calls real Cognito, DynamoDB, Google, Apple, or Secrets Manager.
- [X] T040 Run `npm run typecheck`, `npm run lint`, `npm test`, `sam validate --lint`, and `sam build` from the repository root; fix failures before review.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** can begin immediately.
- **Phase 2** depends on Phase 1 and blocks all user-story work.
- **US1** depends on Phase 2; it supplies the JWT authorizer and iOS identity configuration required by the API stories.
- **US2** depends on Phases 1–2 and US1, because its route must be protected before it can list data.
- **US3** depends on US2 so the created record can be independently proven by listing it.
- **US4** depends on US3 because it needs an owned record to update and delete.
- **Phase 7** depends on the desired user stories, normally all four.

### User Story Completion Order

`US1 (identity) → US2 (list) → US3 (create + list MVP) → US4 (edit/delete)`

### Parallel Opportunities

- T001–T003 can run concurrently.
- Within the foundation, T005–T008 can run in parallel after T004's DTO names are agreed.
- For each story, its contract, unit, and handler integration tests marked `[P]` can be authored in parallel before their implementation tasks.
- T037 and T038 can run in parallel after all CRUD routes exist.

## Parallel Example: User Story 3

```text
T023: POST contract assertions in tests/contract/collection-sets.contract.test.ts
T024: create service tests in tests/unit/modules/collection/collection-sets.service.test.ts
T025: POST isolation tests in tests/integration/handlers/collection-sets.test.ts
```

## Implementation Strategy

### MVP First

1. Complete setup and foundation.
2. Complete US1 so the identity perimeter is real.
3. Complete US2, then US3.
4. Stop after T029 and validate create-plus-list isolation as the minimal usable collection.

### Incremental Delivery

1. Deliver verified sign-in configuration.
2. Deliver secure read-only collection.
3. Deliver creation and validate the MVP.
4. Deliver edit/delete, then complete cross-cutting validation.
