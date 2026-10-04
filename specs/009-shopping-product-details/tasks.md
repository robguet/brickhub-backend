# Tasks: Detalles y tiendas de Google Shopping

**Input**: Design documents from `specs/009-shopping-product-details/`.
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contratos](contracts/openapi.yaml) y [quickstart.md](quickstart.md).
**Tests**: Incluidas por los criterios verificables de la especificación y por la constitución VII, que exige pruebas unitarias de service y controller/handler. Sin AWS real.
**Organization**: Tres historias, orden P1/US1 → P1/US2 → P2/US3; cimientos comunes incluyen las protecciones necesarias para cualquier incremento.

## Format: `[ID] [P?] [Story] Description`

Cada tarea contiene checkbox, ID secuencial y ruta concreta. `[P]` significa que puede prepararse junto con otras tareas del mismo bloque en archivos distintos una vez satisfechos sus prerrequisitos; no autoriza saltar dependencias o editar el mismo archivo simultáneamente. Paths relativos a la raíz del repositorio. No crear framework, base de datos, nuevo secreto o scopes.

## Phase 1: Setup (Shared Infrastructure)

Preparar evidencia y datos de referencia. Sin nuevas dependencias, despliegues ni cambios a samconfig.toml.

- [X] T001 Registrar estado inicial, cambios existentes y resultados de `npm run typecheck`, `npm run lint`, `npm test`, `sam validate --lint` y `sam build` en `specs/009-shopping-product-details/validation.md`; preservar cambios del usuario en `samconfig.toml` y trabajo de008.
- [X] T002 [P] Crear `tests/fixtures/shopping/mexico-shopping-product.json` desde el adjunto del usuario, sin credenciales, manteniendo33 tiendas y8 alternativas y los decimales originales; no copiar metadatos privados de transporte.
- [X] T003 [P] Añadir helpers de producto/dobles de fetch, credenciales y eventos Gateway en `tests/fixtures/shopping/product-helpers.ts`, sin AWS real; mantener helpers y fixtures de búsqueda existentes.

**Checkpoint**: Validar este incremento antes de iniciar la siguiente fase.

## Phase 2: Foundational (Blocking Prerequisites)

Bloquea todas las historias. Compartir las garantías existentes antes de añadir detalles; ninguna demo se entrega sin autenticación y manejo seguro de errores.

- [X] T004 Definir DTOs y puertos independientes `ShoppingProductCatalog`/`ShoppingProductProviderClient` en `src/modules/shopping/shopping-product.types.ts`, con query de seis campos, deadline y tipos de resultado de `data-model.md`; no exigir getProduct a dobles existentes de búsqueda.
- [X] T005 Separar reglas reutilizables de mercado en `src/modules/shopping/shopping.schemas.ts` sin cambiar el schema strict, defaults ni respuesta de búsqueda; dejar composición de query producto para US2.
- [X] T006 Reutilizar o extraer helpers pequeños de lectura/status/error/URL/reflexión en `src/modules/shopping/scrapedo.client.ts`; conservar búsqueda, UTF-8 estricto,4MiB reales, abort reader/fetch, redirect:error,24s upstream y429 seguro; no crear transporte configurado por cliente.
- [X] T007 Ampliar `shoppingSuccessResponse` en `src/modules/shopping/shopping-response.ts` a unión explícita ShoppingSearchData | ShoppingProductData; mantener el envelope, errores/códigos/mensajes existentes y medición de5MiB del proxy completo UTF-8.
- [X] T008 Verificar regresión de helpers compartidos con la suite de `tests/unit/modules/shopping/` y `tests/integration/handlers/search-shopping.test.ts`; registrar resultados en `specs/009-shopping-product-details/validation.md` antes de US1.

**Checkpoint**: Validar este incremento antes de iniciar la siguiente fase.

## Phase 3: User Story 1 - Consultar las tiendas de un producto elegido (Priority: P1) — MVP

**Goal**: Un catálogo elegido produce sus detalles/tiendas y mantiene búsqueda independiente.

**Independent Test**: Handler autorizado con catálogo6789801949246787910 y qLEGO75394 devuelve200,33 tiendas y8 alternativas; stores vacío válido, primeras tres sin precio y sin consultas por alternativas. Mercado predeterminado y autenticación están presentes en MVP.

### Tests for User Story 1

Escribir pruebas antes de sus implementaciones y comprobar el fallo específico, sin confundir errores de setup con evidencia de comportamiento.

- [X] T009 [P] [US1] Añadir pruebas de schema/preservación en `tests/unit/modules/shopping/shopping-product.schemas.test.ts`:33 tiendas/8 alternativas, ausentes/null, vacíos, IDs textuales largos, precios sin redondeo, ofertas repetidas/agotadas y ausencia de title/stores inválida.
- [X] T010 [P] [US1] Añadir pruebas de service/puerto en `tests/unit/modules/shopping/get-shopping-product.service.test.ts` y de credencial compartida/deadline/una llamada en `tests/unit/modules/shopping/scrapedo-product.repository.test.ts`; incluir cero llamadas a alternativas.
- [X] T011 [P] [US1] Añadir pruebas del cliente producto en `tests/unit/modules/shopping/scrapedo-product.client.test.ts`: path fijo, seis parámetros, mismo token privado, flags true, sin device/sort_by/product_id, datos completos y stores vacío.
- [X] T012 [P] [US1] Añadir pruebas HTTP e independencia de búsqueda en `tests/integration/handlers/get-shopping-product.test.ts`; éxito con envelope vigente y cero llamadas producto al ejecutar búsqueda; no depender de servicios reales.
- [X] T013 [P] [US1] Añadir validación automatizada de respuesta/fixture contra `specs/009-shopping-product-details/contracts/openapi.yaml` en `tests/contract/shopping-product.contract.test.ts`, resolver referencias y nullable; probar éxito, vacío, ausencia/null y rechazo de ID numérico sin nuevas dependencias innecesarias.
- [X] T014 [US1] Crear schema de respuesta en `src/modules/shopping/shopping-product.schemas.ts`: “ProductResults requiere title no vacío y stores array (vacío válido)”; “product_id opcional/null cadena no vacía”; “more_options opcional/null array”; “extension_ids opcional/null objeto con catalog_id opcional/null”; “source opcional/null string sin enum fijo”; “MoreOption: title y product_id obligatorios no vacíos”.
- [X] T015 [US1] Modelar tiendas en `src/modules/shopping/shopping-product.schemas.ts`: “Obligatorios position entero positivo y name no vacío”; opcionales/null title,tag,merchant_id,price,currency,shipping,tax_hint,total strings; link HTTP(S); logo/thumbnail imágenes seguras; “extracted_price, shipping_extracted, extracted_total números finitos no negativos”; “rating finito0–5”; “reviews entero no negativo”; “details_and_offers array de strings”; IDs presentes no vacíos; sin límite de33 ni campos fabricados.
- [X] T016 [US1] Implementar `ScrapeDoClient.getProduct` en `src/modules/shopping/scrapedo.client.ts` con URL fija y parámetros permitidos, flags true y credencial existente; schema producto específico, orden/números/ausentes/null preservados, campos desconocidos retirados, sin exigir igualdad de IDs ni source fijo.
- [X] T017 [US1] Implementar puerto de detalles en `src/modules/shopping/scrapedo.repository.ts`, obteniendo credencial con provider existente y deadline compartido antes de getProduct; mantener constructor/dobles de búsqueda compatibles sin casts inseguros.
- [X] T018 [US1] Crear `src/modules/shopping/get-shopping-product.service.ts` usando ShoppingProductCatalog inyectado; una consulta por catálogo y ninguna búsqueda previa, persistencia, deduplicación ni fanout.
- [X] T019 [US1] Crear `src/modules/shopping/get-shopping-product.controller.ts` con rawQueryString, allowlist de seis parámetros, rechazo duplicados/desconocidos400 antes de dependencias/I/O, query validada, deadline27s y envelope tipado; reutilizar error seguro500/502.
- [X] T020 [US1] Crear `src/modules/shopping/get-shopping-product.route.ts` y adaptador `src/handlers/get-shopping-product.ts`: Bearer único bien formado + sub confiable antes de controller/I/O, composición perezosa caliente y logs solo evento/requestId/durationMs/code/storeCount; no tokens/query/catálogo/body; fallo logger no reemplaza respuesta.
- [X] T021 [US1] Añadir GetShoppingProductFunction, evento GET /v1/shopping/product con CognitoJwtAuthorizer, timeout29s,256MB, esbuild, misma variable SCRAPE_DO_SECRET_ARN e IAM al ARN exacto existente, LogGroup14d y ShoppingProductUrl en `template.yaml`; sin recursos de datos ni cambio a samconfig.toml.
- [X] T022 [US1] Ejecutar pruebas de US1 y regresión de búsqueda en `tests/integration/handlers/search-shopping.test.ts`; registrar conservación33/8, vacíos, IDs/decimales y autenticación en `specs/009-shopping-product-details/validation.md`.

**Checkpoint**: Validar este incremento antes de iniciar la siguiente fase.

## Phase 4: User Story 2 - Elegir el mercado de la consulta (Priority: P1)

**Goal**: Mercado explícito/parcial/omitido coincide con valores efectivos de la solicitud.

**Independent Test**: Controller+cliente con dobles reciben México por cada parámetro omitido y respetan mercado personalizado; metadatos recibidos diferentes permanecen intactos.

### Tests and Implementation for User Story 2

- [X] T023 [P] [US2] Añadir pruebas de query en `tests/unit/modules/shopping/shopping-product.query.test.ts`: catálogo positivo1–100 dígitos con ceros iniciales, cero inválido, texto trim1–200, defaults por parámetro, valores personalizados y formatos inválidos; no conversión Number/BigInt.
- [X] T024 [P] [US2] Añadir pruebas de transporte de mercado en `tests/unit/modules/shopping/scrapedo-product.market.test.ts`: valores exactos enviados, URL encoding para espacios/acentos, defaults parciales y dominio reflejado distinto/flags no reflejadas sin inventar metadatos.
- [X] T025 [US2] Implementar query producto en `src/modules/shopping/shopping-product.schemas.ts` usando reglas compartidas: catalog_id “trim exterior, 1–100 dígitos, alguno no cero; preservar cadena y ceros iniciales”; q “trim, 1–200 caracteres”; hl “default es-mx; idioma2–3 letras, región opcional2, case insensitive”; gl “default mx;2 letras”; google_domain “default google.com.mx; regex vigente Google sin esquema/ruta”; location “default Mexico; trim1–200, sin Unicode Cc”.
- [X] T026 [US2] Completar ProductSearchParameters en `src/modules/shopping/shopping-product.schemas.ts`: “Campos opcionales/null: catalog_id, product_id (IDs no vacíos), engine,q,hl,gl,google_domain,location,device (strings), load_all_stores/more_stores (boolean)”; no exigir presencia/igualdad ni rellenar desde query.
- [X] T027 [US2] Integrar query efectiva y metadatos independientes en `src/modules/shopping/get-shopping-product.controller.ts` y `src/modules/shopping/scrapedo.client.ts`; conservar allowlist sensible a mayúsculas y flags fijas, sin redirigir a otro mercado ni normalizar texto recibido.
- [X] T028 [US2] Verificar US2 mediante `tests/unit/modules/shopping/shopping-product.query.test.ts` y `tests/unit/modules/shopping/scrapedo-product.market.test.ts`; documentar mercado regional/defaults y resultado en `specs/009-shopping-product-details/validation.md`.

**Checkpoint**: Validar este incremento antes de iniciar la siguiente fase.

## Phase 5: User Story 3 - Consultar con protección y errores claros (Priority: P2)

**Goal**: Protección y fallos identificables sin secretos ni resultados parciales.

**Independent Test**: Auth/query inválidas producen401/400 sin I/O; fallos simulados producen429/500/502 seguros; truncado anunciado, demoras y tamaños excesivos nunca producen200 parcial.

### Tests and Implementation for User Story 3

- [X] T029 [P] [US3] Añadir pruebas de autorización/validación/observabilidad en `tests/unit/modules/shopping/get-shopping-product.route.test.ts`: Bearer ausente/vacío/duplicado, claims no confiables/sub ausente, query/flags desconocidas o repetidas sin secreto/fetch, logs sin datos sensibles y logger fallido.
- [X] T030 [P] [US3] Añadir pruebas de errores/transporte en `tests/unit/modules/shopping/scrapedo-product.errors.test.ts`:429 con Retry-After válido/inválido, otros status incluidos400/404/410, error lógico200, JSON/UTF-8 inválido, secreto fallido500 y ausencia de producto502; nunca mensajes upstream crudos.
- [X] T031 [P] [US3] Añadir pruebas de cancelación/límites en `tests/unit/modules/shopping/scrapedo-product.limits.test.ts`: headers/body bloqueados, dobles no cooperativos, reader cancel, deadline compartido2/24/27s, bytes reales4MiB, proxy con escapes5MiB y ausencia de retries/redirects.
- [X] T032 [P] [US3] Añadir pruebas de completitud/enlaces en `tests/unit/modules/shopping/scrapedo-product.security.test.ts`: header truncado true con mayúsculas/espacios, cursor no vacío/tipo inválido, ausente/null/vacío permitido, userinfo/esquemas inseguros, parámetros credenciales y reflexión de clave literal/URI/base64 en imágenes.
- [X] T033 [US3] Detectar truncado anunciado y cursor antes de retirar desconocidos en `src/modules/shopping/scrapedo.client.ts`: header Scrape.do-Auto-Page-Truncated true o next_page_token no vacío/tipo inválido ⇒502 UPSTREAM_INVALID_RESPONSE; no devolver cursor ni seguir /product/stores.
- [X] T034 [US3] Aplicar saneamiento producto y reflexión del secreto en `src/modules/shopping/scrapedo.client.ts`: links/logo/thumbnail HTTP(S) sin userinfo; data:image png/jpeg/webp/gif base64 permitida; retirar token/apikey/api_key/scrape_do_api_key/authorization/password/access_token; preservar URL literal segura y rechazar clave reflejada en campos/claves retenidos incluyendo codificaciónURI/base64 cuando proceda.
- [X] T035 [US3] Completar traducción de fallos, abortos y límite upstream en `src/modules/shopping/scrapedo.client.ts` reutilizando helpers:429 con Retry-After1–86400 entero/fechaHTTP futura canónica, demás fallos502, secreto500, sin reintentos ni filtrado/truncado de tiendas.
- [X] T036 [US3] Verificar errores internos/deadline27s y overflow del proxy5MiB en `src/modules/shopping/get-shopping-product.controller.ts` y `src/modules/shopping/shopping-response.ts`; auth precede I/O y ninguna excepción cruda llega a respuesta/log.
- [X] T037 [US3] Completar pruebas SAM/envelopes en `tests/contract/shopping-product.contract.test.ts`: authorizer vigente, ARN exacto, lectura de secreto mínima, timeout29s, memoria256MB, log14d, output y401 nativo Gateway documentado; sin permisos DynamoDB ni wildcard extra.
- [X] T038 [US3] Ejecutar pruebas US3 y registrar evidencias de ceroI/O, errores, cancelación, truncado, tamaños y logs en `specs/009-shopping-product-details/validation.md`.

**Checkpoint**: Validar este incremento antes de iniciar la siguiente fase.

## Phase 6: Polish & Cross-Cutting Concerns

Cerrar trazabilidad, documentación y puertas de calidad. Esta fase no despliega.

- [X] T039 [P] Documentar endpoint, Bearer, seis parámetros/defaults, flujo catálogo del mismo mercado, envelope, opciones fijas,502 parcial y configuración ARN reutilizada en `README.md`; sin valores secretos ni URLs privadas reales.
- [X] T040 [P] Actualizar `specs/009-shopping-product-details/quickstart.md` con comandos válidos y escenarios efectivos, incluyendo elección de catalog_id presente y flujo de dos llamadas; contrastar con `specs/009-shopping-product-details/contracts/openapi.yaml` y `contracts/scrapedo.md`.
- [X] T041 Auditar correspondencia FR-001–FR-014/SC-001–SC-007, schemas y OpenAPI en `specs/009-shopping-product-details/validation.md`; resolver discrepancias del contrato real sin flexibilizar incompletitud, identidad textual o privacidad.
- [X] T042 Ejecutar gates completos `npm run typecheck`, `npm run lint`, `npm test`, `sam validate --lint` y `sam build`, incluida regresión008; registrar comandos/resultados y límites operativos no probados en `specs/009-shopping-product-details/validation.md`.
- [X] T043 Revisar cambios finales en `template.yaml`, `src/modules/shopping/`, `src/handlers/get-shopping-product.ts`, `README.md` y `specs/009-shopping-product-details/tasks.md`; marcar solo tareas verificadas, preservar samconfig.toml/cambios previos y cerrar evidencia en `specs/009-shopping-product-details/validation.md` sin deploy ni llamadas pagadas implícitas.

**Checkpoint**: Validar este incremento antes de iniciar la siguiente fase.

## Dependencies & Execution Order

```text
Setup T001–T003
    ↓
Foundational T004–T008
    ↓
US1 T009–T022 (MVP con Bearer, mercado mexicano y límites existentes)
    ↓
US2 T023–T028 (mercados personalizados y ecos independientes)
    ↓
US3 T029–T038 (matriz completa de errores/seguridad/completitud)
    ↓
Polish T039–T043 (documentación, contrato y cinco gates)
```

Dentro de US1: tests T009–T013 antes de implementación; schemas T014–T015 → cliente T016 → repository T017 → service T018 → controller T019 → route/handler T020 → SAM T021 → verificación T022. El controller T019 necesita query mínima México y catálogo válidos antes del checkpoint, que T025 completa y cubre en su totalidad; no dejar imports rotos entre fases.

US2 verifica el mercado de forma independiente con controller/cliente inyectados, pero usa el flujo US1 ya construido. US3 verifica rechazo/fallo sin requerir resultados exitosos reales; reutiliza el endpoint de US1 y query final de US2. No presentar historias como independientes de los cimientos ni exigir ejecución simultánea: comparten archivos de schemas/client/controller.

T004 precede T007 (unión DTO). T006 modifica transporte: terminar y verificar T008 antes de extender getProduct. T032 precede T033–T035 si estas pruebas comparten doubles recién creados; las pruebas marcadas P usan archivos distintos y helpers T003 ya terminados. Ninguna tarea de infraestructura corre en paralelo con otra edición de template.yaml.

## Parallel Examples

### User Story 1

Después de T008 pueden escribirse en paralelo T009 (schemas), T010 (service/repository), T011 (cliente), T012 (handler) y T013 (contrato); cada tarea usa archivos propios. Ejecutar sus assertions tras completar los componentes correspondientes. Implementaciones T014–T021 son secuenciales por dependencias y archivos compartidos.

### User Story 2

Después de T022 pueden prepararse T023 (shopping-product.query.test.ts) y T024 (scrapedo-product.market.test.ts) en paralelo. T025–T027 se integran secuencialmente: T025 y T026 editan el mismo archivo.

### User Story 3

Después de T028 pueden prepararse T029–T032 en paralelo: route, errores, límites y seguridad tienen archivos distintos. T033–T036 son secuenciales por cliente/controller compartidos; T037 termina contrato antes de verificar T038.

### Cross-cutting

T002/T003 comparten solo fixture importado una vez terminado T002; preparar helpers con referencia al fixture no requiere cargarlo durante escritura. T039 y T040 pueden ejecutarse en paralelo después de US3 porque README y quickstart son distintos. Estas oportunidades describen trabajo por archivos, no requieren agentes adicionales.

## Implementation Strategy

**MVP first**: Setup y cimientos → US1 → validar la consulta de un catálogo con mercado predeterminado, Bearer y33/8 contra fixture. Es demostrable localmente y no autoriza despliegue ni se considera cumplimiento completo de la especificación.

**Incremental delivery**: Añadir US2 y verificar mercado explícito/parcial; añadir US3 para todas las garantías operativas; terminar documentación, contratos y gates. La función solo se da por completa con las tres historias y fase final verificadas. No desplegar automáticamente en checkpoints.

## Coverage & Notes

| Requisitos | Tareas principales |
|---|---|
| FR-001 | T012,T019–T021,T029,T037 |
| FR-002 | T019,T023,T025 |
| FR-003–FR-004 | T005,T019,T023–T028,T029 |
| FR-005–FR-006 | T006,T010–T011,T016–T017,T020–T021,T033–T037 |
| FR-007–FR-010 | T004,T007,T009,T013–T016,T026–T027,T034 |
| FR-011–FR-012 | T006–T007,T019,T029–T038 |
| FR-013 | T008,T012,T022,T042 |
| FR-014 | T039–T041 |
| SC-001–SC-003 | T009–T013,T022–T028,T039–T040 |
| SC-004–SC-005 | T029–T038,T042 |
| SC-006–SC-007 | T008,T022,T039–T043 |

Mantener ausentes frente a null y no transformar IDs a números. No perseguir cursores/alternativas. Mensajes de error compartidos existentes permanecen compatibles con búsqueda. El401 previo a Lambda puede usar formato Gateway conforme a excepción documentada en plan. El secreto se reutiliza con lectura2s y caché300s por instancia, no caché entre Lambdas.

No existe `.specify/extensions.yml`; hooks before_tasks/after_tasks omitidos conforme a la skill. El listado es trabajo pendiente, no evidencia de implementación.
