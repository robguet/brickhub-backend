# Implementation Plan: Búsqueda protegida en Google Shopping

**Branch**: `main` | **Date**: 2026-10-04 | **Spec**: [spec.md](./spec.md)

**Input**: `specs/008-google-shopping-search/spec.md`. El setup identifica la feature como `008-google-shopping-search`; la rama Git real sigue siendo `main`.

## Summary

Añadir `GET /v1/shopping/search?q=LEGO%2075394` con los parámetros opcionales `hl`, `gl`, `google_domain` y `location`. Una Lambda dedicada reutiliza `CognitoJwtAuthorizer`, exige Bearer y claims autenticados antes de validar o acceder al secreto, consulta una sola página de ScrapeDo y devuelve `{ status: "success", data: ... }` con las secciones validadas de la muestra. Los resultados comerciales permanecen independientes del catálogo Brickset y de los datos guardados del usuario.

## Technical Context

**Language/Version**: TypeScript 5.9 en modo strict, Node.js 24.x, ARM64, target ES2022.  
**Primary Dependencies**: AWS SAM, API Gateway HTTP API, Cognito JWT authorizer, Zod 4, AWS SDK v3 Secrets Manager, fetch nativo; reutilizar dependencias instaladas, sin framework HTTP nuevo.  
**Storage**: Sin persistencia ni caché de productos. Secreto existente `scrapedo` con `SCRAPE_DO_API_KEY`; caché de credenciales en memoria por 300 segundos.  
**Testing**: Vitest 4, puertos y clientes inyectables, pruebas unitarias de schemas/service/repository/client/secreto y pruebas de handler y contrato SAM/OpenAPI; sin AWS real en la suite.  
**Target Platform**: HTTP API y Lambda declarados mediante SAM, exclusivamente `dev`; consumidor iOS mediante un contrato nuevo, sin cambiar DTOs existentes.  
**Project Type**: Servicio web serverless.  
**Performance Goals**: Resultados o error seguro dentro de 30 segundos en aceptación. Presupuesto de aplicación 27 segundos: secreto hasta 2 segundos y proveedor hasta 24 segundos, con abort común y margen de serialización.  
**Constraints**: Lambda timeout 29 segundos y memoria inicial 256 MB; integración HTTP API 30 segundos. Lectura upstream hasta 4 MiB y respuesta proxy completa hasta 5 MiB, medidas en UTF-8; rechazo seguro antes de límites de plataforma. Sin reintentos automáticos ni redirects.  
**Scale/Scope**: Una ruta, una Lambda, un Log Group, un permiso de lectura al secreto existente y un output. Una llamada externa por solicitud válida; sin tablas, usuarios, mercados persistidos, colas, consultas de detalle ni paginación navegable.

## Constitution Check

*GATE: revisión previa a investigación y posterior al diseño.*

| Principio | Revisión previa | Diseño posterior |
|---|---|---|
| I. Serverless reproducible | Pass | Solo recursos SAM en `template.yaml`; reutilizar HttpApi y Cognito. |
| II. TypeScript estricto | Pass | Puertos y DTOs explícitos; Zod valida entrada, secreto y respuesta externa; sin `any`. |
| III. Capas | Pass | handler → route → controller → service → repository → cliente/secreto; SDK y fetch fuera del dominio. |
| IV. Contratos estables | Excepción acotada documentada | Ruta `/v1` nueva; envelopes consistentes en Lambda. El 401 nativo del authorizer precede a Lambda y tiene formato Gateway; ver Complexity Tracking. |
| V. Seguridad | Pass | JWT verificado por Gateway, prefijo Bearer y `sub` comprobados en route; secreto privado, IAM mínimo y errores sin datos sensibles. |
| VI. Aislamiento | Pass | No acceso a datos persistidos; no `userId` de cliente ni permisos DynamoDB. |
| VII. Calidad | Pass | Pruebas por frontera y gates `typecheck`, lint, tests, SAM validate y build incluidos en quickstart. |
| VIII. Operación | Pass | Deadline, tamaño acotado, 429/502, logs estructurados seguros y retención 14 días. Alarmas antes de producción, fuera de este corte dev. |
| IX. Simplicidad | Pass | Módulo dedicado, SDK y fetch existentes; sin infraestructura anticipada ni nuevos frameworks. |
| X. Despliegue | Pass | Este plan no lee secretos ni despliega; cualquier smoke cloud/despliegue requiere autorización y revisión de destino. |

**Resultado posterior**: Diseño listo para tareas con una excepción de formato de errores originados en Gateway. No se modifica la constitución. No hay decisiones técnicas sin resolver; compatibilidad de `es-mx` y disponibilidad real del secreto son verificaciones operativas futuras, no motivos para cambiar los valores solicitados.

## Project Structure

### Documentation (this feature)

```text
specs/008-google-shopping-search/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/requirements.md
└── contracts/
    ├── openapi.yaml
    └── scrapedo.md
```

`tasks.md` se generará con `$speckit-tasks`; no forma parte de esta fase.

### Source Code (repository root)

```text
src/handlers/search-shopping.ts                  # nuevo adaptador Lambda
src/modules/shopping/
  shopping.types.ts                             # DTOs, puertos y errores
  shopping.schemas.ts                           # validación de query y proveedor
  search-shopping.route.ts                      # método, autenticación, composición perezosa
  search-shopping.controller.ts                 # rawQueryString, validación y HTTP
  search-shopping.service.ts                    # búsqueda mediante puerto de catálogo
  scrapedo.repository.ts                        # credenciales + cliente externo
  scrapedo.client.ts                            # fetch, deadline, tamaño, errores, saneamiento
  scrapedo-secret.provider.ts                   # SDK v3, secreto validado y caché de credenciales
  shopping-response.ts                          # envelopes específicos sin alterar los de sets
src/shared/authenticated-user.ts                # helper existente reutilizado

tests/unit/modules/shopping/                    # schemas, service, controller, repository, client, secret
tests/integration/handlers/search-shopping.test.ts
tests/contract/shopping.contract.test.ts
tests/fixtures/shopping/                       # muestra de 40 productos sin credenciales

template.yaml                                  # función, evento JWT, IAM, secreto ARN, timeout, log y output
README.md                                      # ruta y configuración de desarrollo
```

**Structure Decision**: Lambda independiente porque requiere otro secreto y un timeout mayor que los 5 segundos globales. Permite restringir IAM a ScrapeDo y no ampliar permisos o latencia de Brickset. `shopping-response.ts` usa los envelopes existentes como convención, evitando ampliar el helper fuertemente tipado para Brickset o cambiar respuestas de otras rutas.

## Diseño de ejecución e infraestructura

1. El evento GET protegido llega a la route. Comprobar header Bearer no vacío y `authenticatedUserFromEvent`; claims sin validar aportados por el cliente nunca se decodifican para autorizar. Solo Gateway puede autenticar JWTs; tests locales inyectan claims como fixtures, no como mecanismo de login.
2. El controller valida `rawQueryString` mediante URLSearchParams para detectar duplicados antes de mapear valores. No interpretar comas en `queryStringParameters` como prueba de duplicados: son caracteres válidos del texto. Rechazar parámetros fuera de `q`, `hl`, `gl`, `google_domain`, `location`, incluidos `token`, `url`, `start`, `device`, `sort_by` y `userId`.
3. Después de autenticar y validar, crear o reutilizar de forma perezosa las dependencias. La construcción no hace I/O. Un puerto de catálogo recibe la query validada; repository pide la credencial y llama al cliente una sola vez.
4. SDK v3 `GetSecretValue` recibe el ARN configurado en `SCRAPE_DO_SECRET_ARN`, timeout abortable de 2 segundos y `maxAttempts: 1`. Parsear SecretString JSON con Zod. Credencial no vacía; caché de credenciales en memoria por 300 segundos, sin compartir errores o resultados. Si falla, error seguro `500 INTERNAL_ERROR`.
5. Cliente usa origen y path constantes, URLSearchParams y `redirect: error`. Deadline de proveedor 24 segundos cubre headers y cuerpo; deadline total de aplicación 27 segundos comprende toda operación asíncrona. Cancelar lectura al superar 4 MiB y abortar peticiones al vencer el tiempo.
6. Detectar status HTTP y error lógico de proveedor antes de interpretar ofertas. Validar y mapear propiedades conocidas, retirar campos desconocidos, sanear enlaces y comprobar que ningún string de salida contiene la clave utilizada. Conservar referencias opacas de producto permitidas, que no son credenciales del servicio.
7. Controller serializa la respuesta, mide el objeto proxy completo en UTF-8 y devuelve `502 UPSTREAM_RESPONSE_TOO_LARGE` si supera 5 MiB; no truncar productos o imágenes silenciosamente. Errores desconocidos internos son `500`, fallos de integración tipados son `502` y límites `429`.
8. Loggear solo evento, código seguro, requestId, duración y conteo de productos. No loggear evento completo, query, headers, URL upstream, body, excepciones crudas ni secreto. No instrumentar trazas con parámetros sensibles; si se añaden subsegmentos solo admiten nombre de operación/host sin query.

SAM añadirá `ScrapeDoSecretArn` como parámetro requerido sin valor real en repositorio; `SCRAPE_DO_SECRET_ARN` referenciará ese ARN. `SearchShoppingFunction` tendrá timeout 29, memoria 256, runtime/build heredados, `GET /v1/shopping/search`, `Auth: { Authorizer: CognitoJwtAuthorizer }`, `AWSLambdaBasicExecutionRole` y lectura del ARN exacto mediante `AWSSecretsManagerGetSecretValuePolicy`. Solo si el secreto utiliza una clave KMS propia, añadir decrypt restringido a esa clave y a Secrets Manager tras verificar configuración; no permisos wildcard. `SearchShoppingFunctionLogGroup` tendrá 14 días de retención; añadir `SearchShoppingUrl`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| IV: envelope en errores 401 originados en Gateway | Reutilizar HTTP API JWT authorizer requerido por arquitectura y autenticación existentes. Rechazos previos a Lambda pueden devolver `{ "message": "Unauthorized" }`; Lambda no puede transformarlos. La excepción se limita a errores de plataforma previos a integración; todo error producido por el módulo usa el envelope. Riesgo: cliente debe reconocer 401 por status y admitir ambos formatos. | Deshabilitar authorizer para dar formato en Lambda debilita la frontera y exige otra verificación JWT. Cambiar a REST API o añadir proxy solo para transformar errores amplía arquitectura. Eliminar esta excepción cuando exista una capa común autorizada que normalice errores previos a Lambda sin degradar autenticación. |
