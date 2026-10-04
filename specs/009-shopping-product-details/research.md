# Research: Detalles y tiendas de Google Shopping

Fecha: 2026-10-04. Evidencia: spec009, constitución1.1.0, módulo shopping existente, template.yaml, package.json, muestra adjunta y documentación primaria. Investigación de código contrastada con agente de investigación requerido por speckit-plan. No llamadas pagadas, lectura de secretos ni deployment.

## 1. Flujo y selección

**Decision**: Un nuevo GET por catálogo proporcionado por consumidor; mantener búsqueda independiente.
**Rationale**: FR-001/013 y la documentación recomiendan catálogo + q, con IDs específicos por mercado. Repetir búsqueda para otro mercado, no asumir que el mismo catálogo sea universal.
**Alternatives considered**: Seleccionar primer resultado/fanout en búsqueda altera contrato/coste; usar product_id o token efímero cambia el modo solicitado.
**Evidence**: [Documentación oficial de producto](https://scrape.do/documentation/google-scraper-api/shopping/product/), secciones Identity/Localization; spec009.

## 2. Opciones y completitud

**Decision**: Enviar ambas flags true. Rechazar expansión parcial declarada por header truncado o cursor no vacío con502; no paginar desde BrickHub.
**Rationale**: load_all_stores recorre páginas dentro del proveedor; more_stores corresponde al modo token legado. El proveedor puede alcanzar un cap o fallar tras algunas páginas y devolver200 parcial con header/cursor. SC-005 pide evitar éxitos parciales. No garantizar todos los comercios mundiales.
**Alternatives considered**: Devolver parcial con indicador/cursor requeriría modificar SC-005 y contrato; seguir páginas agrega latencia/coste; ignorar header oculta incompletitud.
**Evidence**: [Seller list expansion / One-shot](https://scrape.do/documentation/google-scraper-api/shopping/product/). No se infiere garantía de latencia del proveedor.

## 3. Reutilización y límites

**Decision**: Misma credencial y helpers, schema/sanitizer específicos de producto; Lambda dedicada con29s y deadline27s.
**Rationale**: scrapedo.client.ts valida shopping_results y sanitizer lo recorre, por lo que no sirve directamente para product_results. boundedOperation, secret provider2s/cache300s, transport24s/4MiB y proxy5MiB son reutilizables con regresión.
**Alternatives considered**: Duplicar transporte deriva garantías; mezclar ambas respuestas en un schema ambiguo permite falsos éxitos; nueva librería/rediseño de routing es innecesario.
**Evidence**: src/modules/shopping/{scrapedo.client.ts,shopping-deadline.ts,scrapedo-secret.provider.ts,shopping-response.ts}, template.yaml. Los límites son decisiones existentes del proyecto, no mediciones de servicio real.

## 4. Modelo y preservación

**Decision**: Validar campos conocidos de la muestra, preservar ausentes/null, IDs textuales y números finitos. Store solo position/name obligatorios, precio/link opcionales. No deduplicar, ordenar ni recalcular.
**Rationale**: Primeras tres tiendas no tienen precio;33 tiendas/8 alternativas incluyen repetidas, agotadas y fracciones no iguales al total. Provider docs declaran position/name siempre presentes; no exigir igualdad entre IDs ni eco exacto de mercado.
**Alternatives considered**: Requerir precio/link elimina tiendas válidas; number para catálogo pierde precisión; passthrough sin schema expone campos internos. Ampliación de campos no presentes en muestra es futura extensión deliberada del contrato, no parte de este corte.
**Evidence**: Adjunto del usuario y [stores fields](https://scrape.do/documentation/google-scraper-api/shopping/product/).

## 5. Seguridad y contrato

**Decision**: JWT en Gateway, guard Bearer/sub antes de I/O, seis query params públicos, URL fija, IAM sobre ARN existente y envelope vigente. Schema salida con additionalProperties:false; secreto reflejado se rechaza.
**Rationale**: Capas y garantías constitucionales permanecen. Gateway401 nativo es excepción limitada vigente; no reimplementar JWT dentro de Lambda.
**Alternatives considered**: Proxy raw/passthrough sin validación, URL aportada por cliente, scopes nuevos, secreto nuevo o permisos amplios no tienen necesidad en la feature.
**Evidence**: constitución, search-shopping.route.ts, shopping.schemas.ts, contratos008 y SecretsManagerScrapeDoCredentialsProvider.

## Conclusión de investigación

Todas las decisiones técnicas resueltas. El comportamiento real de expansión y disponibilidad del secreto podrá verificarse en dev únicamente con autorización operativa. El diseño controla timeout, truncado anunciado y tamaño sin depender de esa verificación para implementar.

## Validación de artefactos

Contrato OpenAPI3.0.3 parseado con js-yaml y referencias locales resueltas. Los schemas se verificaron con Ajv adaptando nullable de OpenAPI a unión JSON Schema para esta comprobación: muestra33/8, stores vacío, metadatos null y tienda sin precio aceptados; stores ausente e ID numérico rechazados. Estas comprobaciones validan diseño, no sustituyen pruebas de implementación.
