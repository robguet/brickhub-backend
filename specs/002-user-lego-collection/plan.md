# Implementation Plan: Colección LEGO del usuario

**Branch**: `002-user-lego-collection` | **Date**: 2026-09-27 | **Spec**: [spec.md](./spec.md)

## Summary

Incorporar una colección personal de sets bajo `/v1/collection/sets`, protegida por tokens de acceso de Cognito. El User Pool permitirá registro con correo y contraseña verificada, además de Google y Sign in with Apple desde un App Client público de iOS. API Gateway validará el JWT antes de invocar la Lambda; la Lambda tomará solo `requestContext.authorizer.jwt.claims.sub` para construir la partición de DynamoDB. Un único módulo CRUD por capas valida entradas con Zod, usa operaciones condicionales y devuelve envelopes estables sin revelar registros ajenos.

## Technical Context

**Language/Version**: TypeScript 5.9; Node.js 24.x para AWS Lambda  
**Primary Dependencies**: AWS SDK v3 DynamoDB Document Client; tipos AWS Lambda; Zod 4; AWS SAM  
**Storage**: DynamoDB para colección; AWS Secrets Manager para credenciales de Google y Apple  
**Testing**: Vitest 4 con pruebas unitarias de servicios, controller/handler y contrato; `npm run typecheck`, `npm run lint`, `npm test`, `sam validate --lint`, `sam build`  
**Target Platform**: API Gateway HTTP API y Lambda arm64 declarados en AWS SAM; app iOS pública  
**Project Type**: Servicio web serverless  
**Performance Goals**: 95% de listados de colecciones de hasta 100 sets en menos de 2 s en desarrollo  
**Constraints**: `/v1`; access token Cognito con scopes mínimos; identidad exclusiva desde `sub`; sin secretos en código/logs/respuestas; sin `Scan`; 404 indistinguible para recurso ajeno/inexistente; máximo 100 resultados por página  
**Scale/Scope**: cuatro operaciones privadas, un User Pool y un App Client iOS; sin wishlist, compartición, perfiles públicos, importación, fotos ni despliegue automático

## Constitution Check

| Gate | Estado | Evidencia |
|---|---|---|
| Serverless y reproducible | Pasa | User Pool, IdPs, cliente, HTTP API, authorizer, Lambda, tabla, IAM y logs se declaran con SAM; `dev` sigue siendo el único ambiente. |
| TypeScript estricto | Pasa | DTOs, puertos y eventos tendrán tipos explícitos; Zod valida path, query y body. |
| Separación por capas | Pasa | `handler → route → controller → service → repository → infraestructura`; el dominio no depende de AWS. |
| Contratos estables | Pasa | Se añaden rutas `/v1/collection/sets`, OpenAPI y envelopes; no se modifica `GET /v1/sets`. |
| Seguridad e aislamiento | Pasa | Gateway valida JWT/scopes; Lambda deriva `sub`; DynamoDB se particiona por ese valor; secretos fuera del repositorio. |
| Calidad y operación | Pasa | Pruebas de aislamiento/contrato, validación SAM, build, logs seguros y retención explícita. |
| Simplicidad y despliegue controlado | Pasa | Una tabla y una Lambda CRUD; sin caché, GSI, ambientes extra ni despliegue sin revisión. |

**Revisión posterior al diseño**: Pasa. No hay excepciones constitucionales.

## Project Structure

### Documentation (this feature)

```text
specs/002-user-lego-collection/
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
├── handlers/collection-sets.ts                 # Adaptador HTTP API v2
├── modules/collection/
│   ├── collection-set.types.ts                  # Entidad, DTOs, puertos y errores
│   ├── collection-set.schemas.ts                # Schemas Zod
│   ├── collection-sets.route.ts                 # Despacho y composición
│   ├── collection-sets.controller.ts            # HTTP y envelopes
│   ├── collection-sets.service.ts               # Casos de uso
│   ├── collection-set.repository.ts             # Puerto de persistencia
│   └── dynamodb-collection-set.repository.ts    # AWS SDK v3
├── shared/authenticated-user.ts                 # Extracción segura de sub
└── shared/http-response.ts                      # Envelopes reutilizables

tests/
├── unit/modules/collection/
├── integration/handlers/collection-sets.test.ts
└── contract/collection-sets.contract.test.ts

template.yaml
```

**Structure Decision**: Se conserva un proyecto único y se crea un módulo `collection` independiente del catálogo público. Una Lambda atiende las cuatro rutas porque comparten authorizer, tabla y dependencias; route/controller separan cada operación. El repositorio DynamoDB es sustituible para pruebas sin AWS.

## Complexity Tracking

No hay violaciones constitucionales que requieran justificación.
