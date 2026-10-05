# Tasks: Contenido persistente de Radar BrickHub

**Input**: Documentos de diseño en `specs/011-radar-posts/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Organización**: Tareas agrupadas por historia de usuario. Pruebas incluidas porque la constitución del backend las exige para cada módulo y contrato HTTP.

**Convención**: `[P]` significa que puede ejecutarse en paralelo sin editar los mismos archivos. Cada tarea indica archivos concretos.

## Phase 1: Setup

**Purpose**: Establecer el esqueleto del módulo Radar y sus fixtures.

- [X] T001 Crear el módulo y handler vacíos según el árbol acordado en `src/modules/radar/` y `src/handlers/radar.ts`.
- [X] T002 [P] Añadir el fixture fuente de Radar sin alterar la semántica editorial en `tests/fixtures/radar/radar-source.json`.
- [X] T003 [P] Añadir los tipos de configuración para ambiente, tabla y CDN en `src/modules/radar/radar-config.ts`.

---

## Phase 2: Foundational

**Purpose**: Crear recursos compartidos y reglas base que todas las historias necesitan.

- [X] T004 Declarar `RadarTable` con PK/SK, PAY_PER_REQUEST, PITR, Retain y nombre por ambiente en `template.yaml`.
- [X] T005 Declarar bucket `RadarMediaBucket` con bloqueo de acceso público, cifrado y reglas de propiedad del objeto en `template.yaml`.
- [X] T006 Declarar CloudFront OAC, distribución HTTPS y bucket policy limitada a la distribución en `template.yaml`.
- [X] T007 Declarar outputs y variables `RADAR_TABLE_NAME` y `RADAR_MEDIA_BASE_URL` para las funciones del módulo en `template.yaml`.
- [X] T008 Declarar `RadarFunction`, rutas Cognito, permisos de lectura separados del escritor, log group con retención de 14 días y tiempo máximo en `template.yaml`.
- [X] T009 Implementar constantes de claves, tipos canónicos y validadores Zod compartidos en `src/modules/radar/radar.types.ts` y `src/modules/radar/radar.schemas.ts`; aplicar los enums/categorías/tipos de `data-model.md`.
- [X] T010 Implementar serialización, paginación limitada a 50, errores de cursor y derivación de PK en `src/modules/radar/radar.cursor.ts`; rechazar cursores mayores a 4096 caracteres y JSON mayor a 2048 bytes.
- [X] T011 [P] Implementar respuesta JSON estándar y traducción segura de errores para Radar en `src/modules/radar/radar.http-response.ts`.
- [X] T012 Implementar logs estructurados de ruta, requestId, duración, código y conteo sin incluir JWT, cursor ni cuerpo en `src/modules/radar/radar.route.ts`.
- [X] T013 Crear abstracción inyectable de repositorio, timeout de I/O de 4 segundos y validación de versión/estado en `src/modules/radar/radar.repository.ts` y `src/modules/radar/radar.service.ts`.
- [X] T014 Crear el estimador conservador de tamaño DynamoDB en `src/modules/radar/radar-item-size.ts`; rechazar cualquier ítem superior a 350 KiB, incluidos nombres, valores y claves.
- [X] T015 [P] Documentar los permisos exactos y el modelo de claves en `specs/011-radar-posts/data-model.md` y las decisiones de seguridad en `specs/011-radar-posts/research.md` si la plantilla SAM exige ajustes.

**Checkpoint**: `RadarTable`, bucket privado y CDN quedan declarados reproduciblemente; contratos y utilidades base están listos. Ningún despliegue se ejecuta como parte de esta tarea.

---

## Phase 3: User Story 1 - Explorar Radar por categoría (Priority: P1) 🎯 MVP

**Goal**: Consultar tarjetas publicadas de Todos/categorías y destacado con páginas estables.

**Independent Test**: Con fixtures publicados y borradores, listas todas las páginas de cada categoría; no hay duplicados ni borradores, y el destacado sigue en listados.

### Tests for User Story 1

- [X] T016 [P] [US1] Probar filtros, orden, cursor, fecha máxima, destacados y errores de feed en `tests/unit/modules/radar/radar-feed.service.test.ts`.
- [X] T017 [P] [US1] Probar contrato de listas, featured, query inválida y paginación en `tests/contract/radar-feed.contract.test.ts`.
- [X] T018 [P] [US1] Probar autorización previa a I/O y logs seguros para los endpoints de feed en `tests/integration/handlers/radar-feed.test.ts`.

### Implementation for User Story 1

- [X] T019 Implementar entidades resumen y feed global/categoría/destacado con SK cronológica estable en `src/modules/radar/radar.types.ts` y `src/modules/radar/radar.schemas.ts`.
- [X] T020 Implementar Query fuerte paginada de feed global y categorías, sin Scan, sin FilterExpression y sin cuerpo editorial en `src/modules/radar/dynamodb-radar.repository.ts`.
- [X] T021 Implementar casos de uso listPosts/getFeatured con límite predeterminado 20, máximo 50 y orden/tie-break del contrato en `src/modules/radar/radar.service.ts`.
- [X] T022 Implementar controladores y rutas autenticadas `GET /v1/radar/posts` y `GET /v1/radar/featured` en `src/modules/radar/radar.controller.ts`, `src/modules/radar/radar.route.ts` y `src/handlers/radar.ts`.
- [X] T023 Añadir el registro de funciones y outputs API de Radar al template y exportar las rutas en `template.yaml`.

**Checkpoint**: US1 puede probarse con la tabla vacía y fixtures en repositorio falso; despliegue real requiere revisión independiente.

---

## Phase 4: User Story 2 - Leer una publicación completa (Priority: P1)

**Goal**: Abrir un post por slug y preservar metadatos opcionales y bloques en orden.

**Independent Test**: Los nueve detalles del fixture conservan bloques/campos; slug ausente, draft y withdrawn responden 404; versiones discordantes no se entregan como éxito.

### Tests for User Story 2

- [X] T024 [P] [US2] Probar los nueve bloques, reglas de puntuación y validación de tamaño en `tests/unit/modules/radar/radar-content.schemas.test.ts`.
- [X] T025 [P] [US2] Probar contrato de detalle por slug, shape opcional y 404 para draft/withdrawn en `tests/contract/radar-detail.contract.test.ts`.
- [X] T026 [P] [US2] Probar lookup fuerte y lectura transaccional META/CONTENT coherentes en `tests/unit/modules/radar/dynamodb-radar-detail.repository.test.ts`.

### Implementation for User Story 2

- [X] T027 Validar campos requeridos/opcionales, URLs, tipos de bloque y rating repetido de `data-model.md` en `src/modules/radar/radar.schemas.ts`.
- [X] T028 Implementar reserva única de slug y lectura fuerte seguida de TransactGet META/CONTENT; verificar estado y versión en `src/modules/radar/dynamodb-radar.repository.ts`.
- [X] T029 Implementar respuesta pública de detalle con portada, autor, set, precios, fuentes y bloques en el orden almacenado en `src/modules/radar/radar.service.ts`.
- [X] T030 Implementar controlador y ruta autenticada `GET /v1/radar/posts/{slug}` con 404 para slug desconocido, draft o withdrawn en `src/modules/radar/radar.controller.ts` y `src/modules/radar/radar.route.ts`.

**Checkpoint**: US2 se valida sin depender de US1; puede consultar detalle y devolver 404 correctamente con sus propios casos de uso.

---

## Phase 5: User Story 3 - Consultar videos y calendario (Priority: P2)

**Goal**: Cargar videos y lanzamientos próximos/por mes desde colecciones independientes.

**Independent Test**: Videos y eventos aparecen con orden, límites y filtros de mes/fecha correctos; listas vacías permanecen distintas de fallos.

### Tests for User Story 3

- [X] T031 [P] [US3] Probar conversiones de duración/plataforma y consulta de mes/próximos en `tests/unit/modules/radar/radar-media-calendar.service.test.ts`.
- [X] T032 [P] [US3] Probar contrato videos, mes, fecha, parámetros excluyentes y páginas vacías en `tests/contract/radar-media-calendar.contract.test.ts`.
- [X] T033 [P] [US3] Probar Query ascendente por eventos, filtro temporal y cursor del calendario en `tests/unit/modules/radar/dynamodb-radar-calendar.repository.test.ts`.

### Implementation for User Story 3

- [X] T034 Implementar modelos de video y evento con `durationSeconds`, plataformas/estados canónicos, mercado MX y fechas civiles en `src/modules/radar/radar.types.ts` y `src/modules/radar/radar.schemas.ts`.
- [X] T035 Implementar feeds paginados de video, próximos y mes con Query por claves base en `src/modules/radar/dynamodb-radar.repository.ts`.
- [X] T036 Implementar casos de uso con `month`/`from` mutuamente excluyentes y fecha local MX fijada al crear cursor en `src/modules/radar/radar.service.ts`.
- [X] T037 Implementar controladores y rutas autenticadas `GET /v1/radar/videos` y `GET /v1/radar/releases` en `src/modules/radar/radar.controller.ts` y `src/modules/radar/radar.route.ts`.

**Checkpoint**: Videos y calendario son consultables aunque no se hayan publicado posts.

---

## Phase 6: User Story 4 - Incorporar contenido sin alterar publicaciones ajenas (Priority: P2)

**Goal**: Validar e importar contenido/medios repetiblemente, con reporte, conflictos explícitos y publicación selectiva.

**Independent Test**: Dry-run no accede a AWS; apply de registros resueltos crea un conjunto, segunda ejecución queda unchanged; una versión obsoleta no modifica esa entidad.

### Tests for User Story 4

- [X] T038 [P] [US4] Probar importación fuente→normalizada preservando los nueve cuerpos/bloques y duplicados del calendario en `tests/unit/modules/radar/radar-import.transform.test.ts`.
- [X] T039 [P] [US4] Probar idempotencia, conflicto de expectedVersion, reporte parcial y rechazo de estado comercial no resuelto en `tests/unit/modules/radar/radar-import.service.test.ts`.
- [X] T040 [P] [US4] Probar que apply de imágenes carga MIME/URL CDN esperados con cliente S3 simulado en `tests/unit/modules/radar/radar-media-import.test.ts`.

### Implementation for User Story 4

- [X] T041 Implementar transformación del JSON original y normalizado con regla de unicidad set/mercado/fecha, consolidación exacta y fecha confirmada 2026-07-22 para 75383 en `src/modules/radar/radar-import.service.ts`.
- [X] T042 Implementar dry-run local, manifiesto `sourceSha256`, expectedVersions y reporte de conflictos/rechazos en `src/modules/radar/radar-import.service.ts`.
- [X] T043 Implementar transacciones por entidad con escrituras META/CONTENT/feeds, reserva slug, eliminación de claves obsoletas y condición de versión en `src/modules/radar/dynamodb-radar.repository.ts`.
- [X] T044 Implementar uploader S3 restringido a `radar/`, mapeo de claves estables, Content-Type correcto y URL de CloudFront en `src/modules/radar/radar-media-import.service.ts`.
- [X] T045 Implementar CLI con dry-run predeterminado, comprobación STS/cuenta/región/tabla y `--apply` explícito en `scripts/radar-import.ts` y `package.json`.
- [X] T046 Mantener los nueve posts en draft salvo IDs enumerados en `--publish`; bloquear apply si estado comercial de 75383 o assets están sin resolver en `src/modules/radar/radar-import.service.ts`.
- [X] T047 Añadir IAM del operador separado del rol HTTP con acceso de escritura únicamente a tabla Radar y prefijo `radar/` del bucket en `template.yaml` y documentación `specs/011-radar-posts/contracts/radar-import.md`.

**Checkpoint**: La tabla permanece vacía al desplegar; datos se cargan solo con CLI manual y revisión del reporte. Demos de dry-run no alteran servicios AWS.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Configuración persistente de portada, validación integrada, límites y verificación final.

- [X] T048 [P] Implementar GET autenticado `/v1/radar/config` con valores almacenados y sin fallback hardcodeado en `src/modules/radar/radar.service.ts`, `src/modules/radar/radar.controller.ts` y `src/modules/radar/radar.route.ts`.
- [X] T049 Implementar límite/validación final de tamaño de cada ítem y presupuesto de transacción antes de escribir en `src/modules/radar/radar-item-size.ts` y `src/modules/radar/radar-import.service.ts`.
- [X] T050 [P] Añadir prueba de contrato config y rechazo antes de I/O sin JWT en `tests/contract/radar-config.contract.test.ts`.
- [X] T051 Añadir registro del config en transacción versionada del importador en `src/modules/radar/dynamodb-radar.repository.ts`.
- [X] T052 Ejecutar `npm run typecheck`, `npm run lint`, `npm test`, `sam validate --lint` y `sam build`; registrar evidencia en `specs/011-radar-posts/quickstart.md`.
- [X] T053 Preparar carga opt-in de 10,000 fixtures/50 lectores con IDs de ejecución y limpieza acotada en `scripts/radar-load-test.ts`; medir p95 sin ejecutarla contra AWS hasta autorización.
- [X] T054 Validar checklist manual de compatibilidad de categorías, copy, estados, mediaBaseUrl y DTOs iOS en `specs/011-radar-posts/quickstart.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup no depende de otras fases.
- Foundational depende de Setup y bloquea historias por esquemas y recursos compartidos.
- US1 y US2 son P1 y se pueden desarrollar en paralelo después de Foundation; ambas usan los tipos compartidos.
- US3 y US4 son P2; dependen de Foundation. US4 usa las entidades base de US2/US3 y se ejecuta después de estas en la implementación secuencial recomendada.
- Polish depende de US1–US4, salvo T053, que puede prepararse después de US1 sin ejecutarse en AWS.

### User Story Dependencies

- **US1 (P1)**: Foundation; independiente de las demás historias.
- **US2 (P1)**: Foundation; independiente de US1.
- **US3 (P2)**: Foundation; independiente de US1/US2 con entidades compartidas.
- **US4 (P2)**: Foundation y entidades canónicas de US1–US3; implementación secuencial después de ellas para evitar conflictos en el escritor/repositorio.

### Parallel Opportunities

- T002 y T003.
- T009–T011, si se coordinan archivos distintos; T012/T013 comparten módulo y conviene secuenciar.
- Tests de cada historia pueden correr en paralelo porque usan archivos distintos.
- US1/US2 pueden dividirse entre personas tras Foundation, respetando archivos compartidos.
- US3 no debe compartir `radar.repository.ts` edits con US1/US2 sin coordinación.

### Parallel Example: User Story 1

```text
T016 radar-feed.service.test.ts
T017 radar-feed.contract.test.ts
T018 radar-feed handler auth test
Después de tipos foundation:
T020 repositorio de feeds
T021 servicio de feed
T022 controller/route tras T021
```

## Implementation Strategy

### MVP First (US1 Only)

1. Completar Setup y Foundation, incluida tabla/CDN declarado en SAM.
2. Implementar listados por categoría, Todos y destacado (US1).
3. Validar unit/contract/handler y SAM localmente.
4. Revisar un change set y desplegar dev solo tras aprobación del destino.

### Incremental Delivery

1. Añadir detalle completo (US2).
2. Añadir videos/calendario (US3).
3. Añadir importador de contenido e imágenes y carga editorial controlada (US4).
4. Completar configuración, límites, compatibilidad iOS y observación de costes (Polish).

La carga editorial va al final: los endpoints pueden probarse con fixtures/mocks y datos del bundle hasta que se resuelvan estado comercial y assets.

## Notes

- [P] usa archivos diferentes sin dependencias pendientes.
- Todas las tareas de historia mantienen etiqueta [USn] y rutas exactas.
- Las validaciones automatizadas se exigen por la constitución del proyecto.
- Ningún apply, carga real a S3/DynamoDB o despliegue AWS forma parte de ejecutar las tareas de código local sin aprobación para el entorno.


## Resultado de ejecución (2026-10-05)

54/54 tareas locales completadas. Typecheck, lint, 352 pruebas, sam validate --lint y sam build --parallel pasan. T053 entrega herramienta/generación/dry-run de 10,000 fixtures; medición real opt-in pendiente de despliegue autorizado, sin declarar SC-002 cumplido. T054 incluye revisión del modelo iOS y matriz de diferencias; adaptación del cliente pertenece al repositorio móvil. Ver [validation.md](validation.md). No se desplegó ni se cargó contenido en AWS.
