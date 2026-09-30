# Tasks: Perfil autenticado de usuario

**Input**: Diseño de `specs/003-user-profile/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/openapi.yaml`, `quickstart.md`

**Tests**: Obligatorios por la constitución: unitarias de servicio, controller/handler y contrato, sin recursos AWS reales.

## Phase 1: Setup

**Purpose**: Confirmar compatibilidad del contrato antes de añadir rutas.

- [X] T001 [P] Audit the iOS profile DTO and response decoding in `/Users/robertocampos/Documents/Proyectos/Robguet Studios/brickhub-mobile/BrickHubData/Sources/Repositories/LiveProfileRepository.swift`, then record the `email`, `displayName`, and `defaultMarket` profile fields in `specs/003-user-profile/contracts/openapi.yaml`; ownership remains derived only from JWT `sub`.
- [X] T002 [P] Create the profile test directories and contract fixture in `tests/unit/modules/profile/`, `tests/integration/handlers/profile.test.ts`, and `tests/contract/profile.contract.test.ts` without moving existing modules.

---

## Phase 2: Foundational

**Purpose**: Add the typed, secure building blocks shared by GET and PUT.

- [X] T003 Create explicit `UserProfile`, `ProfileRepository`, and `InitializeProfileInput` types in `src/modules/profile/profile.types.ts`; expose only `userId`, `email`, `displayName`, `defaultMarket`, `authProviders`, timestamps, and no `sub` or internal keys.
- [X] T004 [P] Create strict validation in `src/modules/profile/profile.schemas.ts` so `PUT /v1/profile` requires valid `email`, `displayName`, and `defaultMarket`, while rejecting `sub`, `userId`, and unknown fields.
- [X] T005 [P] Extend the safe error definitions in `src/shared/http-response.ts` or a profile-local error module for `PROFILE_NOT_FOUND`, `VALIDATION_ERROR`, and `INTERNAL_ERROR`, preserving the `{ status, code, message }` envelope.
- [X] T006 [P] Add unit tests in `tests/unit/modules/profile/profile.schemas.test.ts` for valid iOS profile input and rejected ownership or unknown fields.

**Checkpoint**: Profile boundaries are typed, strict, and reusable by both private operations.

---

## Phase 3: User Story 1 - Inicializar mi perfil tras iniciar sesión (Priority: P1) 🎯 MVP

**Goal**: Crear o devolver un único perfil para la identidad autenticada después del login.

**Independent Test**: Con un `sub` autenticado falso, llamar PUT dos veces y confirmar `200`, mismo `userId` y `createdAt`; con dos `sub`, confirmar perfiles distintos; un body con dueño debe devolver `400`.

- [X] T007 [P] [US1] Add PUT contract assertions in `tests/contract/profile.contract.test.ts` for exact `/v1/profile`, Bearer security, required iOS input fields, direct `200` profile envelope, and no owner fields using `specs/003-user-profile/contracts/openapi.yaml`.
- [X] T008 [P] [US1] Add initialization service tests in `tests/unit/modules/profile/profile.service.test.ts` for generated UUIDv7, immutable timestamps, repeated requests, and concurrent conditional-create recovery.
- [X] T009 [P] [US1] Add PUT handler integration tests in `tests/integration/handlers/profile.test.ts` for JWT `sub` ownership, missing `sub` → `401`, valid input → `200`, and forged owner fields → `400`.
- [X] T010 [US1] Implement `src/modules/profile/dynamodb-profile.repository.ts` with a consistent `GetItem` and conditional `PutItem` at `PK = USER#<authenticated sub>`, `SK = PROFILE`, `entityType = USER_PROFILE`; after conditional conflict, the service re-reads and returns the winner.
- [X] T011 [US1] Implement `src/modules/profile/profile.service.ts` to generate `userId` once, keep `createdAt` immutable, and return only public profile fields.
- [X] T012 [US1] Implement strict PUT parsing and direct iOS-compatible `200 { status: "success", profile, created }` response in `src/modules/profile/profile.controller.ts`.
- [X] T013 [US1] Implement `src/modules/profile/profile.route.ts` and `src/handlers/profile.ts` to extract identity only with `src/shared/authenticated-user.ts` and call PUT initialization.
- [X] T014 [US1] Add `ProfileFunction` PUT `/v1/profile`, the existing JWT authorizer, `dynamodb:GetItem`/`dynamodb:PutItem` minimum permissions, an explicit retained Log Group, and an output in `template.yaml`.

**Checkpoint**: iOS can complete login because PUT creates or safely returns its own profile.

---

## Phase 4: User Story 2 - Recuperar mi perfil al abrir la app (Priority: P1)

**Goal**: Recuperar exclusivamente el perfil propio durante restauración de sesión.

**Independent Test**: Inicializar perfiles para dos `sub` falsos, recuperar cada uno por GET, y confirmar que no se cruzan; GET de un perfil ausente devuelve `404 PROFILE_NOT_FOUND`.

- [X] T015 [P] [US2] Extend `tests/contract/profile.contract.test.ts` with GET `200`, `401`, and `404 PROFILE_NOT_FOUND` assertions from `specs/003-user-profile/contracts/openapi.yaml`.
- [X] T016 [P] [US2] Add GET service and repository tests in `tests/unit/modules/profile/profile.service.test.ts` for key construction from `sub`, public DTO mapping, missing item, and absence of owner/internal fields.
- [X] T017 [P] [US2] Add GET handler integration tests in `tests/integration/handlers/profile.test.ts` proving A/B profile isolation, missing profile `404`, and missing JWT claim `401` before persistence.
- [X] T018 [US2] Extend `src/modules/profile/dynamodb-profile.repository.ts` and `src/modules/profile/profile.service.ts` with `GetItem` by the authenticated `PK` and literal `SK = PROFILE`, mapping no item to an internal not-found result.
- [X] T019 [US2] Extend `src/modules/profile/profile.controller.ts`, `src/modules/profile/profile.route.ts`, and `src/handlers/profile.ts` with GET response mapping to `200` or safe `404 PROFILE_NOT_FOUND` and no PII in errors or logs.
- [X] T020 [US2] Add GET `/v1/profile` to `ProfileFunction` with the existing JWT authorizer in `template.yaml`, then make profile contract, unit, and integration tests pass.

**Checkpoint**: iOS can restore a previous session with GET and recover a missing profile with PUT.

---

## Phase 5: Polish & Cross-Cutting Validation

- [X] T021 [P] Review `template.yaml` for only `GetItem`/`PutItem` profile access, existing table reuse, authorizer protection, Log Group retention, and no `Scan` or sensitive outputs.
- [X] T022 [P] Verify `specs/003-user-profile/contracts/openapi.yaml` and `tests/contract/profile.contract.test.ts` preserve the iOS DTO envelope and never expose `sub`, JWT, authorization headers, PK, or SK; email remains a required profile field.
- [ ] T023 Run all scenarios in `specs/003-user-profile/quickstart.md` against the deployed development stack after manually reviewing the `brickhub-dev` change set.
- [X] T024 Run `npm run typecheck`, `npm run lint`, `npm test`, `sam validate --lint`, and `sam build` from the repository root; resolve failures before review.

---

## Dependencies & Execution Order

- Phase 1 can start immediately; T001 must finish before adding fields beyond the minimum contract.
- Phase 2 blocks both user stories.
- US1 depends on Phase 2 and is the login-unblocking MVP.
- US2 depends on US1 because GET retrieves a profile initialized by PUT.
- Polish depends on both user stories.

### Parallel Opportunities

- T001 and T002 run independently.
- T004–T006 can run in parallel after type names are agreed in T003.
- In each user story, contract, service, and handler tests marked `[P]` can be written concurrently before implementation.
- T021 and T022 can run in parallel after GET and PUT exist.

## Implementation Strategy

1. Complete setup and foundational validation.
2. Complete US1 through T014, then test iOS login → PUT as the MVP.
3. Complete US2 to support session restoration.
4. Run full validation and manually review the dev deployment change set before deploying.
