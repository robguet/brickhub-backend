# Implementation Plan: Detalles y tiendas de Google Shopping

**Branch**: `main` | **Date**: 2026-10-04 | **Spec**: [spec.md](./spec.md)

**Input**: `specs/009-shopping-product-details/spec.md`. Setup identifica la función activa como `009-shopping-product-details`; la rama Git real es `main`, sin crear una rama nueva.

## Summary

Crear `GET /v1/shopping/product` para consultar un catálogo seleccionado por el consumidor, con búsqueda y mercado explícitos o predeterminados. Una Lambda dedicada reutilizará secreto, presupuesto de tiempo y autenticación existentes; devolverá `{status: "success", data: {product_results, search_parameters?}}`. La búsqueda conserva su contrato. Ambas opciones de tiendas se envían siempre en true. Los resultados declarados parciales por el proveedor producen 502 para cumplir SC-005.

## Technical Context

**Language/Version**: TypeScript 5.9 strict, Node.js 24.x, ARM64, ES2022; versiones y build vigentes.  
**Primary Dependencies**: SAM, API Gateway HTTP API, Cognito JWT, Zod 4, SDK v3 Secrets Manager, fetch nativo, sin dependencias nuevas.  
**Storage**: Sin persistencia de búsquedas/productos; mismo secreto `scrapedo`, JSON `SCRAPE_DO_API_KEY`; caché de credenciales 300 segundos por instancia Lambda.  
**Testing**: Vitest 4; schemas, service, controller, repository, cliente, handler, contrato OpenAPI y SAM. Fixture de 33 tiendas/8 alternativas y dobles sin AWS real.  
**Target Platform**: AWS Lambda y HTTP API declarados en SAM, ambiente dev.  
**Project Type**: Servicio web serverless.  
**Performance Goals**: Resultado/error en menos de 30 segundos; deadline de aplicación 27s compartido por secreto y fetch, lectura de secreto hasta 2s y operación upstream hasta 24s incluyendo cuerpo.  
**Constraints**: Timeout Lambda 29s, 256MB; upstream 4MiB y proxy serializado completo 5MiB UTF-8; sin retries ni redirects; sin éxitos parciales, sin consultas a alternativas ni continuidad de tiendas.  
**Scale/Scope**: Una ruta nueva, Lambda, Log Group y output. Reutilizar parámetro ARN y authorizer; un GET externo por solicitud válida (el proveedor puede hacer varias consultas internas). Sin tabla, cola o cambios de contrato en búsqueda.

## Constitution Check

*GATE: comprobado antes de investigación y después del diseño.*

| Principio | Antes | Después del diseño |
|---|---|---|
| I. Serverless/SAM | Pass | Nueva función/evento/log/output en template.yaml; HttpApi y Cognito existentes. |
| II. Strict | Pass | Tipos explícitos, Zod en fronteras, sin any. |
| III. Capas | Pass | handler → route → controller → service → repository → cliente/secreto. |
| IV. Contratos | Excepción vigente acotada | Ruta nueva /v1; no cambia búsqueda; envelope Lambda consistente; Gateway 401 nativo documentado. |
| V. Seguridad | Pass | JWT verificado por Gateway, Bearer y sub confiable en route; ARN exacto, sin URLs/tokens en logs. |
| VI. Aislamiento | Pass | Sin datos de usuario ni identidad aportada por cliente; sin permisos DynamoDB. |
| VII. Calidad | Pass | Pruebas nuevas y regresión de búsqueda; cinco gates mínimos en quickstart. |
| VIII. Operación | Pass | Abort, límites, 429/502, logs estructurados, retención14d; alarmas previas a producción fuera de dev. |
| IX. Simplicidad | Pass | Reutilización de proveedor y helpers con extensiones pequeñas, sin framework ni interfaces anticipadas. |
| X. Despliegue | Pass | Diseño/local únicamente, sin leer secreto ni ejecutar llamadas pagadas/despliegue. |

**Resultado posterior**: Listo para tareas. Sin aclaraciones técnicas pendientes; disponibilidad y latencia reales de expansión de tiendas quedan como verificación operativa, con rechazo seguro por deadline. No se enmienda la constitución.

## Project Structure

### Documentation (this feature)

```text
specs/009-shopping-product-details/
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

`tasks.md` se generará mediante `$speckit-tasks`.

### Source Code (repository root)

```text
src/handlers/get-shopping-product.ts                  # nuevo
src/modules/shopping/
  get-shopping-product.route.ts                       # nuevo, auth y composición perezosa
  get-shopping-product.controller.ts                  # nuevo, raw query y HTTP
  get-shopping-product.service.ts                     # nuevo, puerto de detalles
  shopping-product.types.ts                           # nuevo, DTOs/puertos de detalles
  shopping-product.schemas.ts                         # nuevo, query y respuesta producto
  shopping.types.ts / shopping.schemas.ts              # reusar errores y mercado sin alterar búsqueda
  scrapedo.repository.ts / scrapedo.client.ts          # añadir getProduct y transport helpers pequeños
  scrapedo-secret.provider.ts / shopping-deadline.ts    # existentes reutilizados
  shopping-response.ts                                # extender success a unión tipada de ambos DTOs
src/shared/authenticated-user.ts                       # existente

tests/unit/modules/shopping/                          # detalles + regresión búsqueda
 tests/integration/handlers/get-shopping-product.test.ts
 tests/contract/shopping-product.contract.test.ts
 tests/fixtures/shopping/mexico-shopping-product.json
template.yaml / README.md                              # nuevo recurso/ruta y documentación
```

**Structure Decision**: Módulo shopping existente, flujos HTTP y schemas independientes. Añadir puertos `ShoppingProductCatalog` y `ShoppingProductProviderClient` sin obligar a dobles de búsqueda existentes a implementar detalles. Repository/client concretos implementan ambos puertos. Helpers comunes pequeños para lectura acotada, status, error lógico, URL segura y reflexión del secreto; no introducir cliente HTTP genérico configurable por usuario.

## Diseño de ejecución e infraestructura

1. API Gateway usa `CognitoJwtAuthorizer` existente; route exige exactamente un header Authorization con Bearer y `authenticatedUserFromEvent`. No decodificar JWT del cliente para autorizar. Rechazar antes de crear dependencias con I/O.
2. Controller lee `rawQueryString` con URLSearchParams, rechaza nombres desconocidos/duplicados, valida con Zod. Extender reglas de query existentes con `catalog_id`: trim exterior, 1–100 dígitos y al menos un dígito distinto de cero; preservar ceros iniciales. No Number/BigInt para normalizar identificadores.
3. Crear service/repository/client/secret provider perezosos y reutilizables por invocaciones calientes. El service usa el puerto de detalles; repository obtiene secreto y realiza una sola llamada getProduct con deadline compartido.
4. URL fija `https://api.scrape.do/plugin/google/shopping/product`. Copiar únicamente seis parámetros validados; añadir token privado y ambas opciones true. No enviar sort_by, product_id, device ni cursores. Desktop es el default documentado del proveedor. Nada del consumidor controla host/path.
5. Conservar boundedOperation y cancelación real de fetch/body; secreto2s, upstream24s, aplicación27s, maxAttempts1 y redirect:error. Leer bytes reales hasta4MiB, parsear UTF-8 estricto, rechazar errores lógicos y status excepto429; no devolver bodies crudos.
6. Antes de éxito detectar `Scrape.do-Auto-Page-Truncated: true` o `product_results.next_page_token` no vacío. Rechazar con `502 UPSTREAM_INVALID_RESPONSE`; no seguir cursors ni exponerlos como si el listado fuera completo. `next_page_token` vacío/ausente no basta para probar integridad global: solo indica que no hay continuación anunciada. Más páginas internas pueden aumentar coste/latencia; no realizar retries automáticos.
7. Schema producto exige `product_results` objeto, título no vacío y stores array; cada store exige posición positiva y nombre no vacío, enlace/precio/resto opcionales nullish. product_id y demás IDs presentes deben ser cadenas no vacías. more_options exige título y product_id textuales en cada elemento. No exigir igualdad product_id/catalog_id ni source fijo. Valores conocidos validados, desconocidos retirados (misma frontera que búsqueda). Validar schema separado, nunca reutilizar shoppingResultSchema ni su sanitizer que dependen de shopping_results.
8. Preservar todos los campos de la muestra, orden, ausentes/null, floats finitos sin redondear y URLs originales cuando son seguras. HTTP(S) sin userinfo; imágenes HTTP(S) o data:image base64 permitida. Eliminar parámetros de credencial de enlaces conocidos y rechazar reflexión de la clave en campos/claves retenidos, incluso URL-decodificada. Detectar credenciales en imágenes data como texto decodificado cuando proceda; no loggear valores. No sanear el payload usando stringify/reparse con reemplazos globales.
9. Envelope success común debe aceptar unión explícita `ShoppingSearchData | ShoppingProductData`, manteniendo la respuesta de búsqueda exacta. Mantener códigos/mensajes seguros existentes para no alterar regresiones. Medir proxy completo5MiB antes de devolver; sin recorte silencioso. Secret failure500, local400/401, upstream429/502.
10. Logs solo evento `shopping_product_completed`/`shopping_product_failed`, requestId, durationMs, code y storeCount; no catálogo, query, ubicación, headers, secretos, body ni error crudo. Fallos de logger no reemplazan respuesta.

SAM: añadir `GetShoppingProductFunction`, nombre `brickhub-${Environment}-get-shopping-product`, handler nuevo, timeout29/memoria256, build esbuild heredado, evento GET `/v1/shopping/product` con JWT; `AWSLambdaBasicExecutionRole` y `AWSSecretsManagerGetSecretValuePolicy` sobre `!Ref ScrapeDoSecretArn`. Variable `SCRAPE_DO_SECRET_ARN` misma referencia. Añadir log group con14d y output `ShoppingProductUrl`. No modificar samconfig.toml ni credenciales reales. Si una clave KMS propia exige decrypt, comprobar y restringir ARN/servicio en fase operativa, sin wildcard.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| IV: envelope uniforme para rechazo Gateway401 | Misma excepción de008: JWT authorizer puede responder `{message:"Unauthorized"}` antes de Lambda. Riesgo limitado al cliente que debe manejar401 por status y ambos formatos. | Desactivar JWT o añadir proxy/REST API solo para dar formato amplía riesgos/arquitectura. Retirar cuando una capa común aprobada pueda normalizar errores previos a Lambda sin debilitar autenticación. |
