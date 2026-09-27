# Tasks: Consulta de sets Brickset

**Input**: Design documents from `/specs/001-search-brickset-sets/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Incluidos porque la constitución exige pruebas unitarias, de controller/handler y de contrato para cada funcionalidad.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar dependencias, infraestructura SAM y configuración no sensible.

- [X] T001 Añadir `zod` y `@aws-lambda-powertools/parameters` como dependencias runtime en `package.json` y actualizar `package-lock.json`.
- [X] T002 [P] Declarar el parámetro `BricksetSecretArn`, la función `SearchSetsFunction`, su ruta HTTP API `GET /v1/sets`, timeout y política mínima de Secrets Manager en `template.yaml`.
- [X] T003 [P] Documentar `BRICKSET_SECRET_ARN` y el uso de Secrets Manager tanto en AWS como en SAM local, sin valores secretos, en `README.md`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Crear los puertos y utilidades que necesitan ambas historias.

**⚠️ CRITICAL**: No iniciar las historias hasta completar esta fase.

- [X] T004 [P] Definir tipos de request, credenciales, respuesta `SetSearchResult`, `BricksetSet` tolerante a opcionales y `ErrorResponse` en `src/modules/sets/set.types.ts` según `data-model.md`.
- [X] T005 [P] Implementar helpers de headers, envelopes de éxito/error y redacción de datos sensibles en `src/shared/http-response.ts`.
- [X] T006 Implementar la lectura cacheada y validación del secreto JSON (`apiKey` obligatorio, `userHash` opcional) en `src/modules/sets/brickset-secret.provider.ts`.
- [X] T007 Implementar el cliente HTTP de Brickset con serialización de `params`, timeout menor que el timeout Lambda y parsing estructural en `src/modules/sets/brickset.client.ts`.
- [X] T008 Definir el puerto y adapter de catálogo que conecte el servicio con el cliente Brickset en `src/modules/sets/brickset.repository.ts`.

**Checkpoint**: La base de tipos, secretos, cliente externo y respuestas está lista; las historias pueden implementarse de forma independiente.

---

## Phase 3: User Story 1 - Consultar un set por número (Priority: P1) 🎯 MVP

**Goal**: Entregar búsquedas válidas con `status`, `matches` y `sets`, incluyendo cero coincidencias como éxito.

**Independent Test**: Ejecutar la prueba de contrato y la integración con un proveedor falso usando `query=10212`; verificar respuesta `200` compatible con `contracts/openapi.yaml`, y verificar `200` con `matches: 0` y `sets: []` para una búsqueda vacía.

### Tests for User Story 1

- [X] T009 [P] [US1] Crear pruebas de contrato para `GET /v1/sets` y sus parámetros `query`, `pageNumber` y `pageSize` en `tests/contract/get-sets.contract.test.ts`.
- [X] T010 [P] [US1] Crear pruebas del caso de uso con respuesta exitosa, cero coincidencias y campos opcionales ausentes en `tests/unit/modules/sets/search-sets.service.test.ts`.
- [X] T011 [P] [US1] Crear prueba de integración del handler con `query=10212` y proveedor Brickset falso en `tests/integration/handlers/get-sets.test.ts`.

### Implementation for User Story 1

- [X] T012 [US1] Implementar el caso de uso de búsqueda, propagando paginación validada y preservando el envelope del proveedor, en `src/modules/sets/search-sets.service.ts`.
- [X] T013 [US1] Implementar validación Zod de `query` no vacío, `pageNumber >= 1` y `pageSize` entre `1` y `500`, más la transformación HTTP de éxito en `src/modules/sets/get-sets.controller.ts`.
- [X] T014 [US1] Implementar el despacho de ruta y adaptación del evento API Gateway hacia el controller en `src/modules/sets/get-sets.route.ts` y `src/handlers/get-sets.ts`.
- [X] T015 [US1] Conectar `SearchSetsFunction` al handler compilable y a la ruta `/v1/sets` declarada en `template.yaml`.

**Checkpoint**: La historia P1 funciona de manera independiente y es demostrable sin usar credenciales reales en la suite.

---

## Phase 4: User Story 2 - Recibir errores seguros y útiles (Priority: P2)

**Goal**: Convertir validaciones, rate limits, timeouts y respuestas inválidas de Brickset en errores seguros y útiles.

**Independent Test**: Ejecutar fakes que simulen consulta ausente, límite del proveedor, timeout y JSON inválido; verificar códigos HTTP coherentes y que ningún body/log incluya `apiKey`, `userHash`, URL autorizada o stack trace.

### Tests for User Story 2

- [X] T016 [P] [US2] Crear pruebas de mapeo de errores upstream (API limit, invalid key, timeout y payload malformado) en `tests/unit/modules/sets/brickset.repository.test.ts`.
- [X] T017 [P] [US2] Añadir pruebas de `400`, `429` y `502` con envelopes seguros en `tests/unit/modules/sets/get-sets.controller.test.ts`.
- [X] T018 [P] [US2] Añadir pruebas de regresión de redacción de secretos y diagnóstico estructurado en `tests/unit/modules/sets/http-security.test.ts`.

### Implementation for User Story 2

- [X] T019 [US2] Implementar la traducción de estados y errores de Brickset a errores de dominio sin propagar el mensaje upstream en `src/modules/sets/brickset.client.ts` y `src/modules/sets/brickset.repository.ts`.
- [X] T020 [US2] Completar el manejo de validación, timeout, rate limit y fallo interno con códigos `VALIDATION_ERROR`, `UPSTREAM_RATE_LIMITED`, `UPSTREAM_UNAVAILABLE` y `UPSTREAM_INVALID_RESPONSE` en `src/modules/sets/get-sets.controller.ts`.
- [X] T021 [US2] Añadir logs estructurados de diagnóstico sin credenciales, headers, URLs autorizadas ni payloads sensibles en `src/modules/sets/get-sets.route.ts` y `src/shared/http-response.ts`.
- [X] T022 [US2] Completar la integración de errores y permisos IAM mínimos en `template.yaml` y `tests/integration/handlers/get-sets.test.ts`.

**Checkpoint**: Ambas historias funcionan independientemente; los fallos del proveedor son observables internamente y seguros para el cliente.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Validar el entregable completo y mantener la documentación operativa.

- [X] T023 [P] Actualizar `README.md` con el endpoint, ejemplo de consulta, configuración del ARN y advertencia de no guardar credenciales.
- [X] T024 [P] Revisar que `specs/001-search-brickset-sets/contracts/openapi.yaml`, `data-model.md` y `quickstart.md` coincidan con el comportamiento implementado.
- [X] T025 Ejecutar el flujo completo de `quickstart.md` (`npm run typecheck`, `npm run lint`, `npm test`, `sam validate --lint`, `sam build`) y corregir cualquier regresión en los archivos afectados.
- [X] T026 Verificar manualmente que los valores de la credencial compartida no aparecen en el repositorio, artefactos compilados, respuestas ni logs de prueba, y documentar la rotación necesaria antes de desplegar.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias; T002 y T003 pueden ejecutarse en paralelo después de T001 si necesitan el nombre final de la función.
- **Foundational (Phase 2)**: depende de Setup y bloquea las historias.
- **US1 (Phase 3)**: depende de Phase 2; es el MVP.
- **US2 (Phase 4)**: depende de Phase 2 y puede comenzar en paralelo con US1, aunque comparte los adapters de Phase 2.
- **Polish (Phase 5)**: depende de las historias que se decida entregar.

### User Story Dependencies

- **US1 (P1)**: solo depende de Phase 2.
- **US2 (P2)**: solo depende de Phase 2; sus pruebas deben poder usar fakes sin US1 completa.

### Parallel Opportunities

- T002 y T003 pueden ejecutarse en paralelo tras T001.
- T004 y T005 son paralelas; T006 y T007 pueden empezar después de T004.
- T009, T010 y T011 son paralelas y deben escribirse antes de implementar T012–T015.
- T016, T017 y T018 son paralelas y deben escribirse antes de T019–T022.
- T023 y T024 son paralelas; T025 y T026 son la validación final.

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1 y Phase 2.
2. Completar T009–T015.
3. Ejecutar el checkpoint de US1 y validar el quickstart con proveedor falso.
4. Detenerse para revisión antes de habilitar llamadas reales a Brickset.

### Incremental Delivery

1. Entregar US1 para búsqueda y cero resultados.
2. Añadir US2 para errores seguros, rate limits y observabilidad.
3. Ejecutar Phase 5 y revisar el change set antes de cualquier despliegue.

## Notes

- `[P]` indica tareas sobre archivos distintos sin dependencias incompletas.
- Cada tarea contiene su ID, etiqueta de historia cuando corresponde y ruta concreta.
- Los valores reales de `apiKey` y `userHash` no deben aparecer en tareas, fixtures, logs ni archivos del repositorio.
