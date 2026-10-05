# Implementation Plan: Catálogo de ofertas LEGO en Amazon

**Branch**: `main` | **Date**: 2026-10-04 | **Spec**: [spec.md](./spec.md)

**Input**: `specs/010-amazon-offer-cards/spec.md`. La rama Git real es `main`; el directorio de la funcionalidad es independiente.

## Summary

Crear `GET /v1/amazon-offers`, protegido por Cognito Bearer, que devuelva las cards de ofertas disponibles como `{status: "success", data: {offers: [...]}}`. Una Lambda dedicada seguirá las capas handler → route → controller → service → repository, consultará una tabla DynamoDB exclusiva mediante una Query ordenada paginada y validará cada item antes de responder. La tabla y el acceso IAM se declararán en SAM. Una carga inicial idempotente poblará las cinco cards de referencia sin sobrescribir ediciones posteriores. No se añaden operaciones administrativas públicas.

## Technical Context

**Language/Version**: TypeScript 5.9 estricto, Node.js 24.x, ARM64, ES2022.

**Primary Dependencies**: AWS SAM, API Gateway HTTP API, DynamoDB SDK v3 / Document Client, Zod 4 y Vitest 4; sin dependencias nuevas.

**Storage**: Tabla DynamoDB nueva y exclusiva para cards públicas; clave de partición fija del catálogo y clave de orden que incorpora disponibilidad, posición e identificador estable. Carga inicial idempotente de cinco items, sin caché ni datos de usuario.

**Testing**: Vitest 4 con pruebas unitarias de schema, servicio, controller, repository y route; integración de handler; contrato OpenAPI; `sam validate --lint` y build.

**Target Platform**: AWS Lambda y API Gateway HTTP API declarados con SAM; ambiente `dev`.

**Project Type**: Servicio web serverless.

**Performance Goals**: Catálogo completo o error seguro en menos de 5 segundos; una lectura DynamoDB paginada y acotada por solicitud válida, sin llamadas externas.

**Constraints**: Lambda con 128 MB y timeout de 5 segundos; Query solo de lectura con privilegio mínimo; Cognito Bearer y `sub` obligatorio antes de I/O; sin resultados parciales, secretos, escaneos ni valores de oferta codificados en la ruta de lectura.

**Scale/Scope**: Una ruta, Lambda, tabla, Log Group, output SAM y recurso de carga inicial. Catálogo pequeño editorial de cards; no CRUD, paginación, caché, extracción de Amazon ni cambios en rutas existentes.

## Constitution Check

*GATE: comprobado antes de investigación y después del diseño.*

| Principio | Antes | Después del diseño |
|---|---|---|
| I. Serverless/SAM | Pass | Tabla, Lambda, HTTP API, permisos, Log Group, output y carga inicial declarados en SAM. |
| II. TypeScript estricto | Pass | Tipos explícitos en DTO, puerto y repositorio; Zod valida el límite DynamoDB; sin `any`. |
| III. Separación por capas | Pass | handler → route → controller → service → repository → Document Client. La carga inicial queda aislada de la ruta pública. |
| IV. Contratos API estables | Pass | Nueva ruta bajo `/v1`; OpenAPI documenta el envelope, campos y error. No cambia contratos existentes. |
| V. Seguridad por defecto | Pass | Cognito Bearer y `sub` se verifican antes de I/O; IAM permite únicamente `dynamodb:Query` sobre la tabla exacta; logs estructurados sin datos internos. |
| VI. Integridad y aislamiento | Pass | No lee ni escribe datos de usuario y emplea tabla independiente de `UserDataTable`. |
| VII. Calidad verificable | Pass | Pruebas por capa, integración, contrato y las cinco puertas de calidad documentadas. |
| VIII. Operación y observabilidad | Pass | Timeout, error seguro, logs con conteo/duración/código y retención explícita de 14 días. |
| IX. Simplicidad y alcance incremental | Pass | Una Query por petición, sin GSI, Scan, caché o CRUD. La carga inicial es la mínima automatización para que los datos solicitados sean reproducibles. |
| X. Despliegues controlados | Pass | Solo documentación y cambios locales; no se despliega ni se modifica AWS durante este flujo. |

**Resultado posterior**: Listo para tareas. No hay aclaraciones técnicas pendientes ni excepciones a la constitución.

## Project Structure

### Documentation (this feature)

```text
specs/010-amazon-offer-cards/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/requirements.md
└── contracts/
    └── openapi.yaml
```

`tasks.md` se generará mediante `$speckit-tasks`.

### Source Code (repository root)
```text
src/
├── handlers/get-amazon-offers.ts                    # nuevo
├── modules/amazon-offers/
│   ├── get-amazon-offers.route.ts                    # nuevo: composición y logs
│   ├── get-amazon-offers.controller.ts               # nuevo: HTTP y envelope
│   ├── get-amazon-offers.service.ts                  # nuevo: caso de uso de lectura
│   ├── amazon-offer.types.ts                         # nuevo: entidades y puerto
│   ├── amazon-offer.schemas.ts                       # nuevo: validación de items
│   ├── dynamodb-amazon-offer.repository.ts           # nuevo: Query tipada
│   └── seed-amazon-offers.ts                         # nuevo: carga idempotente de infraestructura
├── shared/http-response.ts                           # extender con envelope tipado reutilizable o helper específico
└── shared/                                           # utilidades existentes

tests/
├── unit/modules/amazon-offers/                       # nuevos schema/service/controller/repository/route
├── integration/handlers/get-amazon-offers.test.ts    # nuevo
└── contract/amazon-offers.contract.test.ts           # nuevo

template.yaml / README.md                             # recurso, ruta, permisos, output y documentación
```

**Structure Decision**: Añadir un módulo de lectura autónomo para el catálogo público. Reutiliza convenciones HTTP y SDK del repositorio sin mezclar las cards globales con módulos autenticados de perfil, colección, sets o shopping.

## Diseño de ejecución e infraestructura

1. Declarar `AmazonOfferCardsTable` como DynamoDB bajo demanda, con `PK` y `SK` string, protección `Retain` y sin índices secundarios. Cada card comparte `PK = CATALOG#AMAZON_OFFERS`.
2. Guardar una card disponible con `SK = AVAILABLE#<posición de seis dígitos>#<amazonOfferId>`; así una Query con `begins_with(SK, "AVAILABLE#")` devuelve solo publicaciones y ya ordenadas. Las cards no disponibles usan el prefijo `HIDDEN#` y no se consultan. El identificador permanece interno.
3. Crear `GetAmazonOffersFunction`, su evento `GET /v1/amazon-offers`, CognitoJwtAuthorizer, Log Group de 14 días y output de URL. Otorgar a esta Lambda solo `dynamodb:Query` sobre el ARN de la nueva tabla y pasar el nombre mediante `AMAZON_OFFER_CARDS_TABLE_NAME`.
4. El handler adapta el evento. La route exige un único Bearer válido y `sub` no vacío antes de crear controller/service/repository; después emite únicamente `{event, requestId, durationMs, resultCount|code}`.
5. El controller traduce un resultado a `200 {status:"success", data:{offers:[...]}}`; un fallo de repositorio, timeout o item inválido se convierte en `500 {status:"error", code:"INTERNAL_ERROR", message:"No fue posible consultar las ofertas de Amazon."}`. No exponer claves, nombres de tabla ni mensajes AWS.
6. El repositorio recorre `QueryCommand` ascendente por el prefijo disponible, sin `Scan`, filtros ni proyección que pueda ocultar atributos obligatorios, hasta que no haya `LastEvaluatedKey`. Acumula como máximo 100 cards; superar ese límite produce un error seguro antes de responder, nunca una lista parcial. La carga inicial queda dentro de ese límite.
7. El schema valida al leer: `amazonOfferId` no vacío; `position` entero positivo; `isAvailable=true`; texto no vacío para `title` y `discount`; `url` HTTPS absoluta válida sin credenciales; e `image` como HTTPS absoluta válida sin credenciales o ruta propia relativa que inicia con `/`. Los items inconsistentes o la discrepancia con PK/SK se tratan como error interno, no se omiten.
8. La carga inicial es un Custom Resource de CloudFormation respaldado por `SeedAmazonOffersFunction`. En Create/Update usa `PutItem` condicional por PK/SK para insertar únicamente las cinco cards ausentes; en Delete no borra datos. Tiene permiso `dynamodb:PutItem` solo en esta tabla, responde al URL de CloudFormation y nunca es accesible por HTTP. Esto conserva cambios editoriales posteriores y evita una configuración manual no reproducible.
9. El seed conserva literalmente las cuatro propiedades públicas de la especificación. Sus identificadores estables son slugs editoriales y las posiciones 1–5. Las escrituras condicionales repetidas se consideran éxito; otros errores hacen fallar el despliegue sin dejar al endpoint con datos inventados.
10. Probar la ruta protegida, ausencia de ofertas, orden, exclusión de ocultas, campos de imagen remota/ruta relativa, Bearer inválido, datos malformados y errores DynamoDB. El contrato OpenAPI verifica que no se filtran `amazonOfferId`, posición ni estado.
