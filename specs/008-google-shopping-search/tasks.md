# Tasks: Búsqueda protegida en Google Shopping

**Input**: Design documents from `specs/008-google-shopping-search/`.

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [OpenAPI](contracts/openapi.yaml), [integración](contracts/scrapedo.md), [quickstart.md](quickstart.md) y `.specify/memory/constitution.md`.

**Tests**: Incluidos por la obligación del principio VII de la constitución y por los escenarios de aceptación del diseño. Escribir pruebas de cada incremento antes de su implementación y comprobar fallos relevantes; pruebas unitarias y de handler no usan recursos AWS reales. No se requiere un despliegue para completar esta lista.

**Organization**: Cuatro historias, en orden de especificación: US1/US2 P1, US3/US4 P2. La guardia mínima de autenticación es fundacional; US2 completa su matriz, evitando un incremento anónimo de búsqueda.

## Format: `[ID] [P?] [Story] Description`

- `[P]`: Trabajos en archivos distintos que pueden solaparse dentro del grupo de pruebas de su fase, una vez completos sus prerrequisitos.
- `[US1]`–`[US4]`: Historia correspondiente en spec.md. Setup/fundación/polish no llevan etiqueta de historia.
- Paths relativos a la raíz del repositorio; conservar código TypeScript strict, puertos inyectables y dirección handler → route → controller → service → repository → infraestructura.
- Casillas inicialmente pendientes; solo marcar una tarea después de completar y verificar su resultado.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar tooling y datos de aceptación usando el proyecto existente. No crear un stack, instalar dependencias nuevas ni acceder a AWS.

- [X] T001 Confirmar dependencias existentes y tooling de `package.json`, `tsconfig.json` y `vitest.config.mts`; preparar directorios `src/modules/shopping/`, `tests/unit/modules/shopping/` y `tests/fixtures/shopping/` sin cambiar configuraciones globales.
- [X] T002 Crear `tests/fixtures/shopping/mexico-shopping.json` a partir del adjunto del usuario `/Users/robertocampos/.codex/attachments/2db122be-e4c7-46dc-a279-f2b9ae674707/Texto pegado.txt`: mantener los 40 productos principales, IDs, precios, orden, total cero, filtros y tres categorías; retirar cualquier credencial, conservar referencias de producto como datos y al menos una imagen data URI representativa. No inventar valores cuando el adjunto está disponible.

**Checkpoint**: Tooling y fixture listos; ninguna credencial real está en fixtures.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Definir fronteras compartidas y establecer acceso protegido antes de conectar cualquier consulta. Esta fase bloquea todas las historias.

- [X] T003 Definir DTOs, `ShoppingCatalog.search(query, deadline): Promise<ShoppingSearchData>`, puerto de credenciales, dependencia de reloj/abort y error tipado en `src/modules/shopping/shopping.types.ts`; códigos `VALIDATION_ERROR`, `UNAUTHENTICATED`, `INTERNAL_ERROR`, `UPSTREAM_RATE_LIMITED`, `UPSTREAM_UNAVAILABLE`, `UPSTREAM_INVALID_RESPONSE`, `UPSTREAM_RESPONSE_TOO_LARGE`; usar tipos explícitos, sin `any` ni SDK en dominio.
- [X] T004 [P] Crear envelopes en `src/modules/shopping/shopping-response.ts`: éxito `{ status: "success", data }`, error `{ status: "error", code, message }` y content-type JSON; admitir 400/401/429/500/502 sin modificar helpers o contratos Brickset en `src/shared/http-response.ts`.
- [X] T005 [P] Escribir pruebas iniciales en `tests/unit/modules/shopping/search-shopping.route.test.ts` para ausencia de header Bearer y ausencia de `sub`, con query inválida incluida; spies deben demostrar 401 y cero construcciones con I/O, lecturas de secreto y llamadas fetch. Estas pruebas preceden a la guardia.
- [X] T006 Crear guardia y composición inyectable en `src/modules/shopping/search-shopping.route.ts`: Bearer no vacío y `authenticatedUserFromEvent` antes de controller/query/dependencias; no decodificar JWT para autorizar, no usar userId recibido, no añadir bypass local. Las dependencias solo se inicializan después de autenticar; no ejecutar I/O en constructores.

**Checkpoint**: Guardia comprobada con dobles; la búsqueda que se conecte en US1 nace protegida.

---

## Phase 3: User Story 1 - Buscar productos con una sesión válida (Priority: P1)

**Goal**: Ofrecer búsqueda protegida para México con datos fieles a la muestra y una sola página.

**Independent Test**: Con Bearer y claims simulados válidos, buscar `LEGO 75394` y obtener 200 success/data, los 40 productos en orden, total cero conservado, secciones separadas y cero persistencia. Probar también lista vacía válida.

**Tests**: Escribir las pruebas siguientes antes de implementar y comprobar su fallo por la capacidad ausente, no solo por errores de importación.

- [X] T007 [P] [US1] Crear pruebas de contrato en `tests/contract/shopping.contract.test.ts` para `GET /v1/shopping/search`, cinco parámetros, security JWT, envelopes, schemas nullable y errores definidos en `specs/008-google-shopping-search/contracts/openapi.yaml`; comprobar binding SAM, permiso a ARN exacto, runtime/build, timeout, memoria y retención al completar infraestructura.
- [X] T008 [P] [US1] Crear pruebas de datos en `tests/unit/modules/shopping/shopping.schemas.test.ts` con `tests/fixtures/shopping/mexico-shopping.json`: 40 productos, total cero, campos opcionales ausentes/null, IDs largos como texto, precios originales, imágenes data URI, listas/categorías separadas y campos extra eliminados; invalidar tipos incorrectos sin convertir IDs numéricos.
- [X] T009 [P] [US1] Crear pruebas unitarias de delegación y consumo único en `tests/unit/modules/shopping/search-shopping.service.test.ts` y `tests/unit/modules/shopping/scrapedo.repository.test.ts`: query/deadline llegan al puerto, credencial llega solo al cliente externo, una lectura y una llamada cuando no hay caché, sin guardar productos ni seguir pagination.next.
- [X] T010 [P] [US1] Crear pruebas de secreto en `tests/unit/modules/shopping/scrapedo-secret.provider.test.ts`: lectura al ARN configurado, JSON con clave no vacía, caché solo de credenciales y ningún secreto en retorno público; usar SDK sustituido, no AWS real.
- [X] T011 [P] [US1] Crear pruebas HTTP exitosas en `tests/unit/modules/shopping/scrapedo.client.test.ts`: GET al origen fijo, token inyectado por backend, q codificada, defaults de México, desktop y sort_by 2, sin header Bearer de BrickHub y sin redirects ni llamadas adicionales.
- [X] T012 [P] [US1] Crear pruebas de controller en `tests/unit/modules/shopping/search-shopping.controller.test.ts` y de handler en `tests/integration/handlers/search-shopping.test.ts` para búsqueda autenticada, q ausente/vacía/límite y éxito vacío; validar JSON/status e igualdad de valores críticos, no únicamente snapshots.
- [X] T013 [US1] Implementar schemas de `ShoppingProduct` en `src/modules/shopping/shopping.schemas.ts` con las restricciones literales: "Requeridos: `position` entero positivo y `title` string no vacío"; "`product_id`, `catalog_id` como strings no vacíos" opcionales/nullable; `product_link` HTTP(S), `source`/`price` strings, "`extracted_price` número finito no negativo", "`rating` entre 0 y 5", "`reviews` entero no negativo"; `thumbnail`/`source_icon` como "enlace HTTP(S) o data URI de imagen png/jpeg/webp/gif base64. No SVG/HTML ni esquemas ejecutables".
- [X] T014 [US1] Completar schemas de salida en `src/modules/shopping/shopping.schemas.ts`: "`shopping_results` es siempre array, incluso vacío"; secciones opcionales/nullable conservan ausencia/null; `immersive_product_page_token` string opaco; `installment.text` opcional/nullable y `alternative_price.price`/`extracted_price` opcionales/nullable con número no negativo; SearchParameters strings conocidos y "`start` y `sort_by` enteros no negativos"; SearchInformation strings conocidos, "`total_results` entero no negativo" y "`time_taken_displayed` número no negativo"; Filter: "`input_type`, `type` opcionales/nullable" y "`options` array opcional/nullable de objetos con `text`, `shoprs` opcionales/nullable"; Pagination: "`current` entero no negativo, `next` y `previous` strings opcionales/nullable"; Category con "`title` string requerido y `shopping_results` array requerido de ShoppingProduct". Usar stripping Zod, sin passthrough, sin fusionar/deduplicar colecciones.
- [X] T015 [US1] Añadir query básica en `src/modules/shopping/shopping.schemas.ts` y `src/modules/shopping/search-shopping.controller.ts`: q "Requerido, trim, 1–200 caracteres"; valores omitidos de mercado `es-mx`, `mx`, `google.com.mx`, `Mexico`; raw query decodificada una sola vez. Rechazar duplicados y nombres desconocidos. Preparar campos de mercado para validación completa US3 sin ignorar valores explícitos ni permitir parámetros de proveedor.
- [X] T016 [US1] Implementar `src/modules/shopping/scrapedo-secret.provider.ts` con SDK v3 inyectable, ARN de `SCRAPE_DO_SECRET_ARN`, `GetSecretValue`, JSON y Zod; restricción "`SCRAPE_DO_API_KEY` string no vacío" y "TTL de credenciales 300 segundos por contenedor, no caché de búsqueda". Tipar fallos como 500 seguro, no guardar errores en caché; no crear/rotar/leer un secreto real durante la tarea.
- [X] T017 [US1] Implementar camino exitoso de `src/modules/shopping/scrapedo.client.ts` con fetch inyectable, GET fijo `https://api.scrape.do/plugin/google/shopping`, URLSearchParams, `device=desktop`, `sort_by=2`, `redirect: error`; consumir una página, tratar shopping_results=[] como éxito, validar datos como unknown y mantener total cero sin descartar ofertas.
- [X] T018 [US1] Implementar `src/modules/shopping/scrapedo.repository.ts`: obtener credenciales del provider y consultar cliente con la query/deadline, una sola vez; mantener API key fuera del service y los DTOs públicos, sin persistencia ni búsqueda de detalle.
- [X] T019 [US1] Implementar `src/modules/shopping/search-shopping.service.ts` usando el puerto ShoppingCatalog, retornando resultado validado sin AWS/fetch ni alteración de precios, orden o mercado.
- [X] T020 [US1] Conectar controller en `src/modules/shopping/search-shopping.controller.ts`, composición perezosa en `src/modules/shopping/search-shopping.route.ts` y adaptador en `src/handlers/search-shopping.ts`; validar antes de repository, mapear errores tipados y envelope, registrar fallos inesperados solo como código seguro. Constructor/módulo no debe leer secretos ni ejecutar red.
- [X] T021 [US1] Declarar en `template.yaml` `ScrapeDoSecretArn` requerido, `SCRAPE_DO_SECRET_ARN`, `SearchShoppingFunction`, `SearchShoppingFunctionLogGroup` y `SearchShoppingUrl`: GET /v1/shopping/search con `CognitoJwtAuthorizer`, sin scopes nuevos, IAM GetSecretValue solo al ARN exacto, "Lambda timeout 29 segundos y memoria inicial 256 MB", Node.js 24 ARM64/esbuild y retención 14 días. No modificar funciones/tablas existentes ni agregar permisos KMS sin necesidad comprobada.

**Checkpoint**: US1 verificable con credencial válida y fixture. La guardia fundacional y el authorizer permanecen activos; no desplegar un incremento sin US2/US4 verificados.

---

## Phase 4: User Story 2 - Impedir búsquedas sin autenticación (Priority: P1)

**Goal**: Completar la matriz de autenticación y demostrar que ningún rechazo consume secreto o proveedor.

**Independent Test**: Invocar route con credenciales ausentes, vacías o malformadas y sin claims confiables; obtener 401 antes de validación y con cero I/O. JWT vencido/emisor/audiencia incorrectos se prueban en Gateway solo en smoke autorizado, nunca se atribuye validación criptográfica a mocks locales.

- [X] T022 [P] [US2] Ampliar `tests/unit/modules/shopping/search-shopping.route.test.ts` para headers con distinto casing, esquema incorrecto, Bearer vacío, `sub` vacío/ausente y solicitud anónima con q inválida; comprobar cero inicializaciones de provider/cliente, cero lecturas y cero búsquedas.
- [X] T023 [P] [US2] Ampliar `tests/contract/shopping.contract.test.ts` para authorizer Cognito, ausencia de scopes nuevos/Function URL y los dos formatos disjuntos de 401: ErrorResponse de Lambda y GatewayUnauthorized previo a Lambda; verificar que no se promete firma JWT dentro del helper de sub.
- [X] T024 [US2] Completar parsing del esquema Bearer y orden de validación en `src/modules/shopping/search-shopping.route.ts`, reutilizando `src/shared/authenticated-user.ts` sin cambiar otras rutas; rechazar credencial vacía/esquema incorrecto antes de controller, y no confiar en claims extraídos del token enviado.
- [X] T025 [US2] Comprobar la composición perezosa completa de `src/modules/shopping/search-shopping.route.ts` y `src/modules/shopping/scrapedo.repository.ts`: una solicitud rechazada por auth o por validación no obtiene credenciales; mantener clientes reutilizables solo después de las guardias.
- [X] T026 [US2] Ampliar `tests/integration/handlers/search-shopping.test.ts` con auth inválida + query inválida y auth válida + query inválida; exigir respectivamente 401 y 400, sin acceso al secreto/proveedor y sin valores sensibles en los errores.

**Checkpoint**: Autenticación y precedencia verificadas; mocks prueban flujo, SAM prueba binding del verificador real.

---

## Phase 5: User Story 3 - Buscar en un mercado seleccionado (Priority: P2)

**Goal**: Aceptar mercados completos o parciales y validar cada parámetro sin sustituir valores explícitos.

**Independent Test**: Buscar con en/us/google.com/United States y variantes parciales; inspeccionar URL codificada del mock y errores 400 antes de secreto ante valores inválidos.

- [X] T027 [P] [US3] Añadir pruebas de límites/mercado en `tests/unit/modules/shopping/shopping.schemas.test.ts`: idioma con/sin región, país dos letras, Google dominio válido/case-insensitive, dominio con esquema/puerto/ruta ajena inválido, location 1/200/201 y controles Unicode, defaults solo al omitir y vacíos explícitos inválidos.
- [X] T028 [P] [US3] Añadir pruebas de mercado y codificación en `tests/unit/modules/shopping/scrapedo.client.test.ts`: mercado completo/parcial y q con acentos, espacios, &, + y coma; demostrar un único texto de búsqueda, valor explícito conservado y origen fijo.
- [X] T029 [US3] Completar ShoppingQuery en `src/modules/shopping/shopping.schemas.ts` con reglas literales: hl "Trim; idioma 2–3 letras, región opcional de 2 letras separada por guion", gl "Trim; 2 letras", google_domain "Trim; patrón `google.(com o cc o com.cc o co.cc)`; sin esquema, ruta, puerto o query", location "Trim, 1–200 caracteres, sin controles Unicode"; usar regex de `specs/008-google-shopping-search/data-model.md` case-insensitive sin cambiar el valor enviado.
- [X] T030 [US3] Completar parsing estricto de `rawQueryString` en `src/modules/shopping/search-shopping.controller.ts`: detectar duplicados por entradas URLSearchParams, nunca por comas del map Gateway; allowlist solo q/hl/gl/google_domain/location; rechazar token/url/start/device/sort_by/userId y otros nombres. Mantener defaults por omisión, no por vacío; validar antes de credenciales.
- [X] T031 [US3] Completar transporte de parámetros explícitos en `src/modules/shopping/scrapedo.client.ts` y `src/modules/shopping/scrapedo.repository.ts`: no normalizar es-mx a es ni sustituir mercados rechazados; mantener valores trim y defaults sin catálogo adicional.
- [X] T032 [US3] Añadir escenarios completos/parciales, duplicados y vacíos de mercado a `tests/integration/handlers/search-shopping.test.ts`; comprobar respuesta/contexto del proveedor y que toda validación fallida evita I/O.

**Checkpoint**: Mercados explícitos y defaults parciales verificables; errores de combinación upstream quedan cubiertos por US4.

---

## Phase 6: User Story 4 - Comprender fallos de la búsqueda (Priority: P2)

**Goal**: Responder con errores seguros y tiempos/tamaños acotados, distinguiendo vacío de fallos.

**Independent Test**: Dobles de red/secreto y reloj simulan 429, 401 proveedor, fallos, JSON inválido, espera y overflow; verificar status/código, una sola llamada, cancelación y ausencia de secretos en respuesta/logs.

- [X] T033 [P] [US4] Ampliar `tests/unit/modules/shopping/scrapedo.client.test.ts` con 429/401/403/5xx upstream, error lógico no vacío en HTTP 200, JSON inválido, array ausente, redirects, timeout en headers/body y límite real de bytes con Content-Length ausente/falso; vacío [] debe seguir siendo éxito.
- [X] T034 [P] [US4] Ampliar `tests/unit/modules/shopping/scrapedo-secret.provider.test.ts` con ARN ausente, SecretString ausente/JSON inválido/clave vacía, error SDK, lectura lenta, vencimiento TTL y un solo intento; exigir 500 seguro y ninguna llamada posterior al proveedor.
- [X] T035 [P] [US4] Añadir `tests/unit/modules/shopping/shopping-response.test.ts` para límite del proxy completo en UTF-8 y Retry-After: entero 1–86400 o fecha futura válida convertida a segundos, omitir valores inválidos; comprobar overflow genera error pequeño.
- [X] T036 [P] [US4] Crear `tests/unit/modules/shopping/http-security.test.ts` para stripping de token/apiKey/propiedades nuevas, URL con userinfo o query sensible, next de origen/path ajeno, clave dentro de string permitido y preservación de immersive_product_page_token de producto; comprobar cero secretos en respuestas/logs.
- [X] T037 [US4] Aplicar timeout de secreto "2 segundos" y `maxAttempts: 1` con abort en `src/modules/shopping/scrapedo-secret.provider.ts`; respetar deadline global incluso con SDK lento, cachear solo credenciales válidas por "300 segundos por contenedor" y traducir fallos a INTERNAL_ERROR sin causa cruda.
- [X] T038 [US4] Completar errores/lectura acotada en `src/modules/shopping/scrapedo.client.ts`: HTTP429 → 429, otros no-2xx → 502, error lógico en 200/JSON/schema inválido → 502; "proveedor hasta 24 segundos" cubre headers/body; "Lectura hasta 4 MiB" cuenta bytes reales, cancela reader/abort y no reintenta ni sigue redirects. No clasificar mensajes por coincidencias vagas.
- [X] T039 [US4] Implementar saneamiento de salida en `src/modules/shopping/scrapedo.client.ts`: URL producto sin userinfo y solo HTTP(S), eliminar params de credenciales `token`, `apiKey`, `api_key`, `SCRAPE_DO_API_KEY`, `authorization`, `password` case-insensitive; continuaciones solo origen/path esperado, reconstruidas relativas con allowlist del modelo; omitir enlaces ajenos. Si cualquier string permitido incluye la API key utilizada, rechazar con 502 seguro sin devolverla o loggearla.
- [X] T040 [US4] Aplicar "Deadline de aplicación 27 s" en `src/modules/shopping/search-shopping.controller.ts`, `src/modules/shopping/scrapedo.repository.ts` y `src/modules/shopping/search-shopping.service.ts`, pasando deadline/abort a las fronteras y cancelando I/O pendiente; reservar margen bajo timeout Lambda 29 s y respuesta de aceptación 30 s, sin timeout basado únicamente en Promise.race que deje solicitudes vivas.
- [X] T041 [US4] Completar `src/modules/shopping/shopping-response.ts` y `src/modules/shopping/search-shopping.controller.ts`: "proxy serializado hasta 5 MiB" medido en UTF-8 sobre objeto completo; overflow → 502 UPSTREAM_RESPONSE_TOO_LARGE pequeño, sin truncar datos. Propagar Retry-After saneado solo para 429; fallos internos desconocidos → 500 sin stack/body crudo.
- [X] T042 [US4] Añadir logs seguros en `src/modules/shopping/search-shopping.route.ts`: evento, código, requestId, duración y conteo únicamente; excluir query/event completo/Authorization/API key/URL upstream/body/errores crudos, y evitar subsegmentos de tracing con query sensible.
- [X] T043 [US4] Completar `tests/integration/handlers/search-shopping.test.ts` y `tests/unit/modules/shopping/search-shopping.controller.test.ts` con fallos de secreto/proveedor, 429, overflow y deadline global mediante temporizadores controlados; capturar logs y verificar cero credenciales, cancelación y respuesta segura dentro del presupuesto, sin perder el éxito vacío ni mercados explícitos.

**Checkpoint**: Matriz de fallos completa con dobles; ningún test consume créditos o secretos reales.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Revisar fidelidad de contratos, documentar operación y completar gates locales. No desplegar ni ejecutar smoke cloud como parte de estas tareas.

- [X] T044 [P] Actualizar `README.md` con ruta, cinco parámetros, Bearer, orden descendente fijo, límites, envelopes y configuración por ARN; ajustar `specs/008-google-shopping-search/quickstart.md` a comandos/fixtures implementados, manteniendo la distinción 401 Gateway, limitación SAM local y validación es-mx solo en smoke autorizado.
- [X] T045 Revisar consistencia final de `src/modules/shopping/`, `tests/contract/shopping.contract.test.ts`, `template.yaml` y `specs/008-google-shopping-search/contracts/openapi.yaml`: nulabilidad/required, códigos HTTP, secretos excluidos, IAM mínimo, no modificación de Brickset/perfiles/datos guardados. Añadir pruebas de regresión solo donde una divergencia encontrada lo requiera; no ampliar el alcance.
- [X] T046 Ejecutar `npm run typecheck`, `npm run lint`, `npm test`, `sam validate --lint` y `sam build`; documentar comandos, resultados y limitaciones reales en `specs/008-google-shopping-search/validation.md`. Resolver fallos relacionados y registrar cualquier bloqueo del entorno sin marcar el gate como aprobado. No leer secretos reales, invocar proveedor pagado ni desplegar para completar esta tarea.

**Checkpoint**: Feature implementada solo cuando todas las tareas y gates locales pasan; smoke/despliegue permanecen acciones separadas autorizadas.

---

## Dependencies & Execution Order

### Phase Dependencies

T001–T002 Setup → T003–T006 Foundational → T007–T021 US1 → T022–T026 US2 → T027–T032 US3 → T033–T043 US4 → T044–T046 Polish. Este es el orden seguro recomendado: las fases de historias comparten varios archivos, por lo que sus mutaciones no deben ejecutarse simultáneamente.

- Setup precede a la definición de puertos y pruebas que consumen el fixture.
- Foundational bloquea todas las historias y pone la protección mínima antes de conectar red.
- US1 proporciona el flujo de búsqueda reutilizado por las demás historias.
- US2 depende de la route fundacional y del cableado US1 para demostrar ausencia de I/O; no depende de mercados personalizados ni del tratamiento detallado de fallos.
- US3 depende de US1 y de la guardia; US4 no bloquea sus pruebas exitosas con proveedor simulado. Un mercado rechazado se verifica con errores en US4.
- US4 depende del flujo US1 y se integra después de US2/US3 para evitar conflictos en client/controller/route; sus pruebas de fallo son independientes con dobles.
- Polish y gates finales dependen de las cuatro historias. No considerar listo para exposición un incremento pendiente de autenticación completa, timeout, tamaño o saneamiento.

### Within Each User Story

Pruebas primero → schemas/modelos → infraestructura externa → repository → service → controller/route/handler → integración. Dentro de una fase, una tarea sin `[P]` respeta el orden anterior salvo dependencias explícitas. Cuando varias tareas editan el mismo archivo, ejecutarlas de forma secuencial.

### Parallel Opportunities

Las pruebas `[P]` de cada historia usan archivos distintos y dobles independientes. Las tareas fundacionales de responses y pruebas de route también usan archivos distintos después de definir los tipos. Documentación de polish puede solaparse con la revisión final cuando el comportamiento ya es estable; el gate final espera ambas.

No marcar client y repository o schemas y controller como paralelos cuando la segunda tarea consume el contrato todavía incompleto de la primera. Los ejemplos siguientes describen oportunidades de ejecución; no autorizan por sí mismos crear agentes o chats.

## Parallel Example: User Story 1

Tras fundación y fixture, escribir en paralelo pruebas de contrato (`tests/contract/shopping.contract.test.ts`), schemas (`tests/unit/modules/shopping/shopping.schemas.test.ts`), cliente (`tests/unit/modules/shopping/scrapedo.client.test.ts`) y service/repository. Todas usan los puertos definidos; las implementaciones esperan su grupo de pruebas.

## Parallel Example: User Story 2

Con US1 completo, ampliar simultáneamente `tests/unit/modules/shopping/search-shopping.route.test.ts` y `tests/contract/shopping.contract.test.ts`. Después modificar la route y su composición en secuencia, y cerrar con integración de handler.

## Parallel Example: User Story 3

Con US1/US2 completos, ampliar simultáneamente `tests/unit/modules/shopping/shopping.schemas.test.ts` y `tests/unit/modules/shopping/scrapedo.client.test.ts`. Luego completar schemas → controller → client/repository → handler tests.

## Parallel Example: User Story 4

Con el flujo exitoso estable, escribir en paralelo las pruebas del cliente, provider del secreto, responses y `http-security.test.ts`; son archivos separados. Las mutaciones de client y controller, incluidos deadline/saneamiento, se realizan en secuencia antes de la integración final.

## Implementation Strategy

### MVP First

1. Completar Setup y Foundational.
2. Implementar US1 y cerrar la matriz US2: búsqueda de México protegida con JWT, una página y resultados fieles.
3. Completar las protecciones de operación US4 antes de exponer el endpoint: secreto seguro, error mapping, tiempos, tamaño y saneamiento. US3 puede reservarse para una entrega posterior del MVP si se acuerda reducir alcance; para completar esta feature sigue siendo obligatoria.
4. Validar con dobles, fixture y gates locales. No desplegar como parte de esta lista.

### Incremental Delivery

US1 entrega búsqueda predeterminada; US2 verifica toda la frontera de autenticación; US3 añade el mercado editable; US4 completa recuperabilidad y seguridad de operación. Cada checkpoint tiene criterios independientes de prueba, pero el cierre de la feature requiere las cuatro historias.

### Coverage & Completion

| Requisito | Cobertura principal |
|---|---|
| FR-001, FR-006, FR-007 | US1: ruta SAM, llamada fija y credencial privada |
| FR-002 | Foundational + US2: JWT/Bearer, precedencia y cero I/O |
| FR-003, FR-004, FR-005 | US1 query básica + US3: límites, defaults y mercado |
| FR-008, FR-009, FR-010, FR-011 | US1: datos fieles, secciones, una página y vacío válido |
| FR-012, FR-013, FR-014 | US2 + US4: errores, deadlines, tamaño, saneamiento y logs |
| FR-015 | US1 + Polish: consulta sin persistencia ni cambios de rutas existentes |
| SC-001, SC-004 | Fixture/handler de US1 con 40 ofertas y total cero |
| SC-002 | Auth de US2 con spies y binding de Gateway |
| SC-003 | Mercados completos/parciales de US3 |
| SC-005, SC-006 | Matriz de fallos/temporizadores y seguridad de US4 |

## Notes

- La excepción de formato del 401 previo a Lambda está delimitada en plan.md; no cambiar el authorizer para reformatear ese error.
- No añadir tablas, caché de productos, filtros activos, compras, reintentos automáticos o paginación cliente. La caché TTL es solo de credenciales.
- ARN real, KMS si aplica, aceptación de es-mx y firma/vigencia real del JWT son verificaciones operativas de smoke futuro, explícitamente autorizado. No inventar sus resultados ni dejarlas como tareas locales obligatorias imposibles de completar sin despliegue.
- No hay `.specify/extensions.yml`; no se registraron hooks previos o posteriores para esta generación.

**Resumen de generación**: 46 tareas; US1: 15, US2: 5, US3: 6, US4: 11; compartidas: 9. 17 tareas marcadas `[P]`.
