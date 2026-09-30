---

description: "Tareas ejecutables para guardar sets autenticados"
---

# Tasks: Guardar set del usuario

**Input**: Design documents from `/specs/005-save-user-set/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/openapi.yaml](contracts/openapi.yaml), [quickstart.md](quickstart.md)

**Tests**: Obligatorios por la Constitución del proyecto: pruebas unitarias del caso de uso y controller/handler, además de pruebas de contrato. No deben llamar a AWS real.

**Organization**: Las tareas se agrupan por historia; los elementos compartidos están en fases previas y bloquean las historias.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Crear la estructura aislada del módulo y sus ubicaciones de pruebas sin alterar el módulo de posesiones físicas existente.

- [X] T001 [P] Crear los directorios `src/modules/saved-sets/`, `tests/unit/modules/saved-sets/`, `tests/integration/handlers/` y `tests/contract/` para los archivos definidos en `specs/005-save-user-set/plan.md`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Definir contratos internos, validación y la infraestructura privada que todas las historias usan.

**⚠️ CRITICAL**: No iniciar las historias hasta completar esta fase.

- [X] T002 [P] Definir `SavedSet`, `SaveUserSetInput`, `SetSnapshotInput`, `SaveResult` y el puerto de repositorio en `src/modules/saved-sets/saved-set.types.ts`, con destino exclusivo `collection | wishlist`, campos internos fuera de la respuesta y clave natural `(sub, destination, setID)`.
- [X] T003 [P] Implementar schemas Zod estrictos en `src/modules/saved-sets/saved-set.schemas.ts`: `setID` positivo; `number` no vacío máximo 64; `numberVariant` entero no negativo; `name` no vacío máximo 500; `year` 1949–2100; `theme` no vacío máximo 200; `category` no vacío máximo 100; `released` booleano; `pieces` entero no negativo; timestamps ISO 8601 con `Z`; URLs HTTPS; `rating` 0–5; conteos no negativos; `packagingType` máximo 100; y `barcode.EAN` de 8–14 dígitos. Rechazar claves desconocidas, `userId`, claves DynamoDB y destinos inválidos.
- [X] T004 [P] Añadir las pruebas de schemas en `tests/unit/modules/saved-sets/saved-set.schemas.test.ts` para campos obligatorios, cada límite/rango, URLs y timestamps inválidos, EAN inválido, claves extra y ambos destinos válidos.
- [X] T005 Añadir `SaveUserSetFunction`, `POST /v1/saved-sets`, `CognitoJwtAuthorizer`, variables de tabla, permisos limitados a `dynamodb:PutItem` y `dynamodb:UpdateItem`, y Log Group de 14 días en `template.yaml`.

**Checkpoint**: Tipos, validación y el punto de entrada privado están definidos; pueden comenzar las historias.

---

## Phase 3: User Story 1 - Guardar un set autenticado (Priority: P1) 🎯 MVP

**Goal**: Un usuario autenticado puede guardar un snapshot válido de Brickset en `collection` o `wishlist`, asociado únicamente a su `sub`.

**Independent Test**: Con un evento HTTP que contenga un `sub` válido, guardar el objeto de ejemplo en cada destino devuelve el envelope de éxito y el repositorio recibe claves de la partición de ese `sub`.

### Tests for User Story 1

- [X] T006 [P] [US1] Crear pruebas de contrato para `POST /v1/saved-sets`, seguridad Bearer, request `{ destination, set }`, respuestas `201`/`400`/`401`/`500` y envelope en `tests/contract/saved-sets.contract.test.ts`, usando `specs/005-save-user-set/contracts/openapi.yaml` y `template.yaml`.
- [X] T007 [P] [US1] Crear pruebas de integración del handler en `tests/integration/handlers/save-user-set.test.ts` que simulen un `requestContext.authorizer.jwt.claims.sub`, guarden el snapshot de ejemplo en ambos destinos y prueben que el `sub` no puede venir de body.
- [X] T008 [P] [US1] Crear pruebas del caso de uso en `tests/unit/modules/saved-sets/saved-sets.service.test.ts` para generación de timestamps UTC y envío del snapshot sin alterarlo al repositorio con el usuario autenticado.
- [X] T009 [P] [US1] Crear pruebas de controller en `tests/unit/modules/saved-sets/saved-sets.controller.test.ts` para `201`, body inválido `400` y envelope `{ status, data: { savedSet } }` sin campos internos.

### Implementation for User Story 1

- [X] T010 [US1] Implementar `DynamoDbSavedSetRepository` en `src/modules/saved-sets/dynamodb-saved-set.repository.ts` con `PK = USER#<sub>`, `SK = SAVED_SET#<setID>`, `entityType = SAVED_SET`, `destination`, `set`, `createdAt` y `updatedAt`; usar `PutCommand` condicional y no exponer PK/SK/entityType.
- [X] T011 [US1] Implementar el caso de uso de creación en `src/modules/saved-sets/saved-sets.service.ts`, generando timestamps una vez y llamando al puerto solo con `AuthenticatedUser.sub`, sin aceptar propietario desde la entrada.
- [X] T012 [US1] Implementar validación HTTP y éxito `201` en `src/modules/saved-sets/saved-sets.controller.ts` con `collectionSuccessResponse`; convertir fallos no clasificados en `500 INTERNAL_ERROR` sin detalles de AWS.
- [X] T013 [US1] Implementar composición, parseo seguro de JSON, extracción mediante `authenticatedUserFromEvent` y despacho POST en `src/modules/saved-sets/saved-sets.route.ts`; responder `401 UNAUTHENTICATED` cuando no haya `sub` y `404 RESOURCE_NOT_FOUND` para métodos no soportados.
- [X] T014 [US1] Exportar el adaptador HTTP API v2 que delega en la route en `src/handlers/save-user-set.ts`.

**Checkpoint**: Una solicitud autenticada válida crea un set en cualquiera de los destinos y no puede asociarlo a otro usuario.

---

## Phase 4: User Story 2 - Evitar registros duplicados o ambiguos (Priority: P2)

**Goal**: El mismo usuario no obtiene duplicados para el mismo set; los reintentos son idempotentes y un nuevo destino mueve el registro existente.

**Independent Test**: Dos guardados concurrentes o consecutivos de `(sub, destination, setID)` dejan un solo item; el primero devuelve `201/created=true` y el segundo `200/created=false`. Cambiar destino crea el otro item permitido.

### Tests for User Story 2

- [X] T015 [P] [US2] Añadir pruebas del repositorio en `tests/unit/modules/saved-sets/dynamodb-saved-set.repository.test.ts` que verifiquen `ConditionExpression` de no existencia, las claves exactas para ambos destinos y `GetCommand` solo con la PK/SK autenticada tras `ConditionalCheckFailedException`.
- [X] T016 [P] [US2] Extender `tests/unit/modules/saved-sets/saved-sets.service.test.ts` con primer guardado, reintento y destinos distintos; verificar que el reintento conserva el snapshot y timestamps originales.
- [X] T017 [P] [US2] Extender `tests/integration/handlers/save-user-set.test.ts` y `tests/contract/saved-sets.contract.test.ts` para `200` idempotente, `201` de alta y la ausencia de un `409` para reintentos válidos.

### Implementation for User Story 2

- [X] T018 [US2] Completar `src/modules/saved-sets/dynamodb-saved-set.repository.ts` para convertir el conflicto condicional en lectura del item `SAVED_SET` de la misma PK/SK y devolver un resultado que distinga creado de existente; propagar como fallo interno una colisión que no pueda leerse de forma segura.
- [X] T019 [US2] Actualizar `src/modules/saved-sets/saved-sets.service.ts` y `src/modules/saved-sets/saved-sets.controller.ts` para mapear el resultado creado a `201` y el existente a `200`, preservando `createdAt`/`updatedAt` del primer guardado.

**Checkpoint**: Reintentar no duplica ni sobrescribe snapshots; colección y wishlist siguen siendo registros distintos y exclusivos.

---

## Phase 5: User Story 3 - Proteger el guardado de sets (Priority: P3)

**Goal**: Solicitudes sin Bearer JWT válido no persisten datos y no pueden declarar un propietario distinto.

**Independent Test**: Eventos sin `sub` reciben `401` antes de invocar el repositorio; el contrato y SAM vinculan la ruta al authorizer Cognito; un `userId` en body se rechaza con `400`.

### Tests for User Story 3

- [X] T020 [P] [US3] Extender `tests/integration/handlers/save-user-set.test.ts` para ausencia de `sub`, `sub` vacío y `userId` malicioso; comprobar `401` o `400` según corresponda y cero llamadas al repositorio.
- [X] T021 [P] [US3] Extender `tests/contract/saved-sets.contract.test.ts` para comprobar `CognitoAccessToken`, `scheme: bearer`, `bearerFormat: JWT` y el enlace `Auth: { Authorizer: CognitoJwtAuthorizer }` de `POST /v1/saved-sets` en `template.yaml`.

### Implementation for User Story 3

- [X] T022 [US3] Revisar y ajustar `src/modules/saved-sets/saved-sets.route.ts`, `src/modules/saved-sets/saved-set.schemas.ts` y `template.yaml` para garantizar que la única identidad utilizada es `sub` validado, que nunca se registran headers/body sensibles y que ninguna ruta alternativa evita `CognitoJwtAuthorizer`.

**Checkpoint**: La protección está comprobada en la frontera Gateway, handler y validación de body; no hay escritura cruzada.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verificar la entrega completa, consistencia documental y ausencia de regresiones.

- [X] T023 [P] Actualizar `README.md` con `POST /v1/saved-sets`, autenticación Bearer y enlace al contrato, sin incluir tokens ni valores sensibles.
- [X] T024 Ejecutar los escenarios de `specs/005-save-user-set/quickstart.md` y resolver cualquier fallo en los archivos afectados.
- [X] T025 Ejecutar los comandos definidos en `package.json` y validar la infraestructura en `template.yaml` mediante `npm run typecheck`, `npm run lint`, `npm test`, `sam validate --lint` y `sam build`; registrar resultados sin desplegar AWS.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** no depende de otras tareas.
- **Phase 2** depende de T001 y bloquea cualquier historia.
- **US1** depende de T002–T005 y es el MVP funcional.
- **US2** depende de la creación funcional de US1 (T010–T014).
- **US3** depende de la route y el contrato creados en US1; sus pruebas también validan la infraestructura de T005.
- **Polish** depende de US1 y de las historias adicionales que se decida entregar.

### User Story Dependencies

- **US1 (P1)**: entregable independiente después de la fase fundacional.
- **US2 (P2)**: extiende el mismo endpoint para garantizar idempotencia; depende de US1.
- **US3 (P3)**: verifica el perímetro privado de US1 y la infraestructura ya declarada; depende de US1.

### Parallel Opportunities

- T002, T003 y T004 pueden realizarse en paralelo tras crear la estructura.
- T006–T009 pueden escribirse en paralelo antes de T010–T014.
- T015–T017 pueden ejecutarse en paralelo al iniciar US2.
- T020 y T021 pueden ejecutarse en paralelo al iniciar US3.
- T023 puede correr en paralelo con las validaciones finales una vez estabilizado el contrato.

## Parallel Example: User Story 1

```text
T006: contrato en tests/contract/saved-sets.contract.test.ts
T007: handler en tests/integration/handlers/save-user-set.test.ts
T008: servicio en tests/unit/modules/saved-sets/saved-sets.service.test.ts
T009: controller en tests/unit/modules/saved-sets/saved-sets.controller.test.ts
```

## Implementation Strategy

### MVP First

1. Completar T001–T005.
2. Ejecutar T006–T014 y validar US1 de forma aislada.
3. Ejecutar T024–T025 para probar el MVP antes de continuar.

### Incremental Delivery

1. US1 ofrece guardado autenticado en ambos destinos.
2. US2 añade idempotencia y protección frente a duplicados.
3. US3 endurece y evidencia la seguridad en Gateway, handler y contrato.
4. Polish confirma calidad, documentación y build sin despliegue.

## Notes

- Todas las tareas siguen el formato obligatorio de checklist, ID secuencial y rutas exactas.
- `[P]` indica archivos distintos que pueden realizarse sin depender de tareas incompletas.
- No se debe desplegar a AWS dentro de estas tareas.
