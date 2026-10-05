---

description: "Tareas de implementación para el catálogo público de ofertas LEGO en Amazon"
---

# Tasks: Catálogo de ofertas LEGO en Amazon

**Input**: Documentos de diseño de `/specs/010-amazon-offer-cards/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/openapi.yaml` y `quickstart.md`

**Tests**: Obligatorios por la constitución del proyecto. Escribir las pruebas indicadas antes de la implementación que cubren y comprobar que fallan inicialmente.

**Organization**: Las tareas se agrupan por historia de usuario. El fundamento compartido bloquea las historias; las tareas dentro de cada historia entregan un incremento verificable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede realizarse en paralelo con tareas sin dependencias y archivos distintos.
- **[Story]**: Historia de usuario a la que pertenece la tarea.
- Cada tarea incluye rutas exactas de archivos.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar datos de prueba y los puntos de validación compartidos sin tocar recursos AWS reales.

- [X] T001 [P] Crear fixtures de cards disponibles, ocultas, vacías y malformadas —incluidas las cinco promociones exactas de FR-008— en `tests/fixtures/amazon-offers/amazon-offer-cards.ts`.
- [X] T002 [P] Escribir la prueba de contrato para `GET /v1/amazon-offers`, Bearer Cognito, el envelope `{status, data:{offers}}` y la exclusión de campos internos en `tests/contract/amazon-offers.contract.test.ts` usando `specs/010-amazon-offer-cards/contracts/openapi.yaml`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Definir el modelo validado y el acceso DynamoDB que comparten todas las historias.

**⚠️ CRITICAL**: Ninguna historia puede considerarse terminada hasta completar esta fase.

- [X] T003 Crear tipos estrictos para `AmazonOfferCard`, `AmazonOffer`, el resultado de lista y el puerto de repositorio en `src/modules/amazon-offers/amazon-offer.types.ts`; incluir `PK` fijo `CATALOG#AMAZON_OFFERS`, `SK`, `entityType`, identificador interno, posición y disponibilidad como datos no públicos.
- [X] T004 [P] Escribir pruebas de frontera para items de DynamoDB en `tests/unit/modules/amazon-offers/amazon-offer.schemas.test.ts`: `position` entero positivo, `isAvailable=true`, `title` y `discount` no vacíos, URL HTTPS sin credenciales e imagen HTTPS o ruta relativa que inicia con `/`; cubrir inconsistencia de PK/SK/estado.
- [X] T005 Implementar los schemas Zod de persistencia y proyección pública en `src/modules/amazon-offers/amazon-offer.schemas.ts`, haciendo que un item inválido falle completo y que `amazonOfferId`, posición, estado y claves DynamoDB no lleguen al DTO público.
- [X] T006 [P] Escribir pruebas de Query, orden, recorrido de páginas y límite de 100 cards para el repositorio en `tests/unit/modules/amazon-offers/dynamodb-amazon-offer.repository.test.ts`, incluyendo fallo si queda una página sin entregar o se supera el límite.
- [X] T007 Implementar `DynamoDbAmazonOfferRepository` en `src/modules/amazon-offers/dynamodb-amazon-offer.repository.ts`: Query ascendente por `PK = CATALOG#AMAZON_OFFERS` y prefijo `AVAILABLE#`, sin Scan ni filtros, acumular hasta 100 items y validar antes de proyectar.
- [X] T008 Añadir helpers tipados de éxito y error interno seguros para el nuevo envelope en `src/shared/http-response.ts`, preservando los contratos actuales de módulos de sets, colección, perfil y shopping.

**Checkpoint**: El modelo, la validación de la frontera de almacenamiento y la lectura ordenada son verificables con dobles; todavía no existe una ruta HTTP pública.

---

## Phase 3: User Story 1 - Ver ofertas de Amazon disponibles (Priority: P1) 🎯 MVP

**Goal**: Entregar las cinco cards disponibles, en orden editorial y con sus cuatro atributos públicos, desde almacenamiento persistido.

**Independent Test**: Inyectar las cinco cards de referencia disponibles, invocar `GET /v1/amazon-offers` con Cognito Bearer válido y comprobar `200` con las cinco promociones ordenadas, campos exactos y ningún identificador interno.

### Tests for User Story 1

- [X] T009 [P] [US1] Escribir pruebas del caso de uso y controller en `tests/unit/modules/amazon-offers/get-amazon-offers.service.test.ts` y `tests/unit/modules/amazon-offers/get-amazon-offers.controller.test.ts` para proyectar exactamente `{title, discount, url, image}` y envelope `200`.
- [X] T010 [P] [US1] Escribir pruebas de route pública y logs estructurados en `tests/unit/modules/amazon-offers/get-amazon-offers.route.test.ts`: no exigir Bearer, registrar solo evento/requestId/durationMs/resultCount o code y no registrar la URL editorial completa.
- [X] T011 [P] [US1] Escribir la integración del handler en `tests/integration/handlers/get-amazon-offers.test.ts` para una solicitud GET pública exitosa con las cinco cards ordenadas y sin llamar servicios AWS reales.
- [X] T012 [P] [US1] Escribir pruebas de carga inicial idempotente en `tests/unit/modules/amazon-offers/seed-amazon-offers.test.ts`: insertar exactamente los cinco items, tratar conflictos condicionales como éxito y no borrar en eventos Delete.

### Implementation for User Story 1

- [X] T013 [US1] Implementar el caso de uso de lista y el controller en `src/modules/amazon-offers/get-amazon-offers.service.ts` y `src/modules/amazon-offers/get-amazon-offers.controller.ts`, devolviendo las cards en orden del repositorio sin mutar datos ni transformar los cuatro valores públicos.
- [X] T014 [US1] Implementar handler y route protegida perezosa en `src/handlers/get-amazon-offers.ts` y `src/modules/amazon-offers/get-amazon-offers.route.ts`, validando Cognito Bearer y `sub` antes de componer repository/service/controller y registrar metadatos seguros.
- [X] T015 [US1] Implementar la Lambda de Custom Resource en `src/modules/amazon-offers/seed-amazon-offers.ts`: conservar los valores exactos de FR-008, usar slugs y posiciones 1–5, ejecutar `PutItem` condicional por PK/SK y responder correctamente a Create, Update y Delete de CloudFormation.
- [X] T016 [US1] Declarar tabla, Lambda HTTP, Lambda seed, Custom Resource, permisos de mínimo privilegio, variables, Log Groups de 14 días y output de ruta en `template.yaml`; configurar `GET /v1/amazon-offers` sin authorizer, Query únicamente para la ruta y PutItem únicamente para seed.

**Checkpoint**: La ruta protegida entrega el catálogo inicial desde DynamoDB, el Custom Resource lo crea sin sobrescribirlo y la historia P1 es demostrable de forma independiente.

---

## Phase 4: User Story 2 - Consultar el catálogo cuando no hay ofertas (Priority: P2)

**Goal**: Diferenciar un catálogo sin publicaciones de una falla y excluir cards ocultas sin modificar el orden de las visibles.

**Independent Test**: Inyectar cero cards y luego una mezcla de keys `AVAILABLE#`/`HIDDEN#`; verificar respectivamente `200` con `offers: []` y `200` con solo las visibles en orden relativo.

### Tests for User Story 2

- [X] T017 [P] [US2] Añadir los escenarios de lista vacía y cards ocultas en `tests/unit/modules/amazon-offers/get-amazon-offers.service.test.ts` y `tests/unit/modules/amazon-offers/dynamodb-amazon-offer.repository.test.ts`, verificando que la consulta usa únicamente el prefijo `AVAILABLE#`.
- [X] T018 [P] [US2] Añadir la integración HTTP de catálogo vacío y de exclusión de ocultas en `tests/integration/handlers/get-amazon-offers.test.ts`, comprobando que ambos casos son `200` y nunca `404` ni error parcial.

### Implementation for User Story 2

- [X] T019 [US2] Ajustar, según los tests, `src/modules/amazon-offers/dynamodb-amazon-offer.repository.ts`, `src/modules/amazon-offers/get-amazon-offers.service.ts` y `src/modules/amazon-offers/get-amazon-offers.controller.ts` para preservar una lista vacía como éxito y excluir `HIDDEN#` sin deduplicar, reordenar ni consultar identidad.

**Checkpoint**: La ausencia de promociones se comunica como catálogo vacío y una card no publicada no puede filtrarse al contrato público.

---

## Phase 5: User Story 3 - Recibir respuestas seguras ante problemas de datos (Priority: P2)

**Goal**: Informar problemas del almacenamiento o de los datos como errores internos seguros, nunca como lista vacía o parcial.

**Independent Test**: Simular error DynamoDB, timeout, item disponible con datos obligatorios inválidos y exceso de 100 cards; comprobar `500 INTERNAL_ERROR`, mensaje estable, cero datos parciales y log sin detalles internos.

### Tests for User Story 3

- [X] T020 [P] [US3] Añadir pruebas de controller para error de repositorio, timeout e item inválido en `tests/unit/modules/amazon-offers/get-amazon-offers.controller.test.ts`, esperando exactamente `500 INTERNAL_ERROR` y el mensaje seguro del contrato.
- [X] T021 [P] [US3] Añadir pruebas de route para logs y manejo de excepciones en `tests/unit/modules/amazon-offers/get-amazon-offers.route.test.ts`, comprobando que no se filtran nombre de tabla, PK/SK, stack trace, URL ni headers.
- [X] T022 [P] [US3] Añadir integración de error seguro y no parcial en `tests/integration/handlers/get-amazon-offers.test.ts`, cubriendo dato disponible malformado y fallo del repositorio.

### Implementation for User Story 3

- [X] T023 [US3] Completar la traducción de fallos en `src/modules/amazon-offers/get-amazon-offers.controller.ts` y `src/modules/amazon-offers/get-amazon-offers.route.ts`: capturar errores de repositorio/validación/límite, devolver solo el envelope `500` documentado y emitir contexto de log permitido.
- [X] T024 [US3] Añadir un presupuesto de ejecución seguro a `src/modules/amazon-offers/dynamodb-amazon-offer.repository.ts` y su configuración de Lambda en `template.yaml`, asegurando que la lectura termina con éxito o error antes de 5 segundos y no devuelve acumulados parciales.

**Checkpoint**: Los fallos operativos y de integridad se distinguen de un catálogo vacío sin revelar información interna.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Completar documentación, compatibilidad de contrato y evidencia de calidad.

- [X] T025 [P] Validar y, si es necesario, ajustar ejemplos, schemas y respuestas de `specs/010-amazon-offer-cards/contracts/openapi.yaml` mediante `tests/contract/amazon-offers.contract.test.ts`, incluyendo lista vacía y ausencia de campos internos.
- [X] T026 [P] Documentar el endpoint público, su respuesta, ausencia de Bearer, tabla de cards y el proceso de seed no destructivo en `README.md`, enlazando `specs/010-amazon-offer-cards/contracts/openapi.yaml`.
- [X] T027 Ejecutar los escenarios de `specs/010-amazon-offer-cards/quickstart.md` y las puertas `npm run typecheck`, `npm run lint`, `npm test`, `sam validate --lint` y `sam build`; corregir solo los archivos de la funcionalidad que fallen.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias; T001 y T002 pueden realizarse en paralelo.
- **Foundational (Phase 2)**: Depende de T001; bloquea la implementación de todas las historias. T004 y T006 son pruebas primero; T005 depende de T003/T004 y T007 depende de T003/T005.
- **US1 (Phase 3)**: Depende de Phase 2. T009–T012 son pruebas primero y pueden realizarse en paralelo; T013–T016 siguen su orden técnico.
- **US2 (Phase 4)**: Depende del reader de US1 (T013–T014) y de la Query de T007; sus pruebas pueden iniciar tras esos contratos.
- **US3 (Phase 5)**: Depende de Phase 2 y se integra sobre el endpoint de US1; puede comenzar sus pruebas tras T013–T014, en paralelo con US2.
- **Polish (Phase 6)**: Depende de las historias seleccionadas; T025 y T026 pueden hacerse en paralelo. T027 es el cierre.

### User Story Dependencies

- **US1 (P1)**: MVP; requiere el fundamento y no depende de otras historias.
- **US2 (P2)**: Extiende la misma lectura protegida de US1 para distinguir el estado vacío y las cards no disponibles.
- **US3 (P2)**: Extiende US1 con traducción segura de fallos; no depende de US2, aunque comparte el mismo módulo.

## Parallel Opportunities

- T001 y T002 pueden ejecutarse simultáneamente.
- Después de T003, las pruebas T004 y T006 pueden ejecutarse en paralelo.
- Después de Phase 2, T009, T010, T011 y T012 son pruebas en archivos distintos y pueden ejecutarse en paralelo.
- Después de T013–T014, las pruebas T017–T018 (US2) y T020–T022 (US3) pueden avanzar en paralelo.
- T025 y T026 pueden ejecutarse en paralelo antes de T027.

## Parallel Example: User Story 1

```text
T009: tests/unit/modules/amazon-offers/get-amazon-offers.service.test.ts y get-amazon-offers.controller.test.ts
T010: tests/unit/modules/amazon-offers/get-amazon-offers.route.test.ts
T011: tests/integration/handlers/get-amazon-offers.test.ts
T012: tests/unit/modules/amazon-offers/seed-amazon-offers.test.ts
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar T001–T008 para disponer de frontera de datos y repositorio comprobables.
2. Completar las pruebas y la implementación T009–T016.
3. Validar el endpoint con las cinco cards exactas, sin token y sin AWS real.
4. Ejecutar las puertas de calidad aplicables antes de integrar las historias P2.

### Incremental Delivery

1. Setup + fundamento entregan la lectura persistida y validada.
2. US1 entrega el catálogo de promociones inicial — MVP.
3. US2 añade el estado vacío y exclusión editorial.
4. US3 añade garantías de errores seguros y observabilidad.
5. Polish confirma contrato, documentación y gates completos.

## Notes

- Todas las tareas usan la ruta protegida `/v1/amazon-offers`; no se crea CRUD administrativo.
- Los valores Amazon iniciales viven únicamente en la carga declarativa de seed y los fixtures, no en el reader de producción.
- Ninguna prueba unitaria ni de integración debe usar AWS, secretos, tokens o un despliegue dev real.
