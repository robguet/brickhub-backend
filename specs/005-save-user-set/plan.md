# Implementation Plan: Guardar set del usuario

**Branch**: `005-save-user-set` | **Date**: 2026-09-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-save-user-set/spec.md`

## Summary

Añadir `POST /v1/saved-sets`, una operación privada que recibe `destination` (`collection` o `wishlist`) y la ficha completa de un set de Brickset. API Gateway exige un Bearer JWT de Cognito y la Lambda deriva exclusivamente `sub` de sus claims. Un módulo por capas valida el DTO con Zod y conserva un único item por usuario y set: un segundo guardado en el otro destino actualiza `destination`. Devuelve `201` para un alta o `200` para un reintento o movimiento.

## Technical Context

**Language/Version**: TypeScript 5.9 estricto; Node.js 24.x Lambda  
**Primary Dependencies**: AWS SAM, API Gateway HTTP API JWT authorizer, AWS SDK v3 DynamoDB Document Client, tipos AWS Lambda, Zod 4, Vitest 4  
**Storage**: `UserDataTable` existente; partición por `sub` y clave por destino e identificador de set  
**Testing**: Vitest unitario, integración de handler y contrato OpenAPI/SAM; `npm run typecheck`, `npm run lint`, `npm test`, `sam validate --lint`, `sam build`  
**Target Platform**: API Gateway HTTP API y Lambda arm64 mediante SAM; cliente iOS  
**Project Type**: Servicio web serverless  
**Performance Goals**: 95% de guardados válidos confirmados en menos de 2 s bajo carga normal de desarrollo  
**Constraints**: `/v1`; JWT Bearer Cognito; identidad solo desde `sub`; IAM limitado a `PutItem`/`UpdateItem`; body estricto; sin `Scan`; sin tokens, secretos ni PII en logs/respuestas; un destino por set y usuario  
**Scale/Scope**: Una ruta privada, una Lambda y un módulo de guardado. No incluye listar, editar, borrar o mover sets ni cambia el CRUD de instancias físicas existente.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Estado | Evidencia y diseño |
|---|---|---|
| Arquitectura serverless y reproducible | Pasa | Lambda, evento HTTP API, autorización, permisos y Log Group estarán en `template.yaml`; se reutilizan tabla y ambiente `dev`. |
| TypeScript estricto | Pasa | DTOs, entidad, puerto y resultado tendrán tipos explícitos; Zod valida body. |
| Separación por capas | Pasa | `handler → route → controller → service → repository → DynamoDB`; el dominio no importa AWS. |
| Contratos API estables | Pasa | Nueva ruta `/v1/saved-sets` y OpenAPI propio, sin modificar búsqueda ni CRUD de instancias. |
| Seguridad e integridad | Pasa | Gateway valida JWT; `sub` determina PK; escritura condicional evita duplicados; no hay `userId` en contrato. |
| Calidad y operación | Pasa | Pruebas sin AWS real, contrato SAM/OpenAPI, Log Group con retención y errores seguros. |
| Simplicidad y despliegue controlado | Pasa | Reutiliza Cognito, DynamoDB y envelopes; no añade índices, tablas, secretos, ambientes ni despliegue. |

**Revisión posterior al diseño**: Pasa. La clave propuesta permite aislamiento y deduplicación en la tabla actual, sin excepciones constitucionales.

## Project Structure

### Documentation (this feature)

```text
specs/005-save-user-set/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/openapi.yaml
└── tasks.md                 # Generado por speckit-tasks
```

### Source Code (repository root)

```text
src/
├── handlers/save-user-set.ts
├── modules/saved-sets/
│   ├── saved-set.types.ts
│   ├── saved-set.schemas.ts
│   ├── saved-sets.route.ts
│   ├── saved-sets.controller.ts
│   ├── saved-sets.service.ts
│   └── dynamodb-saved-set.repository.ts
└── shared/
    ├── authenticated-user.ts
    └── http-response.ts

tests/
├── contract/saved-sets.contract.test.ts
├── integration/handlers/save-user-set.test.ts
└── unit/modules/saved-sets/
    ├── saved-set.schemas.test.ts
    ├── saved-sets.service.test.ts
    ├── saved-sets.controller.test.ts
    └── dynamodb-saved-set.repository.test.ts

template.yaml
```

**Structure Decision**: `saved-sets` será independiente: guarda snapshots de catálogo en colección o wishlist, mientras que `collection` actual administra instancias físicas con cantidad, estado y notas. Una Lambda dedicada conserva el límite de responsabilidades y sus permisos mínimos.

## Complexity Tracking

No hay violaciones constitucionales que requieran justificación.
