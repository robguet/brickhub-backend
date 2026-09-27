# Implementation Plan: Consulta de sets Brickset

**Branch**: `001-search-brickset-sets` | **Date**: 2026-09-20 | **Spec**: [spec.md](./spec.md)

## Summary

Exponer `GET /v1/sets` para buscar sets Brickset mediante una consulta validada. La Lambda adaptará HTTP a las capas de catálogo, recuperará un secreto JSON por ARN de AWS Secrets Manager y llamará a `getSets` con parámetros serializados de manera segura. Conservará el envelope compatible `status`, `matches` y `sets`; los errores serán seguros y consistentes.

## Technical Context

**Language/Version**: TypeScript 5.9, Node.js 24.x para AWS Lambda  
**Primary Dependencies**: AWS Lambda types; Zod para validación; AWS Lambda Powertools Parameters para secreto JSON con caché; `fetch` nativo para Brickset  
**Storage**: AWS Secrets Manager para credenciales; no hay persistencia de resultados  
**Testing**: Vitest 4; pruebas unitarias, controller/handler y contrato; `sam validate --lint` y `sam build`  
**Target Platform**: AWS Lambda arm64 detrás de API Gateway HTTP API; SAM local  
**Project Type**: Servicio web serverless  
**Performance Goals**: al menos 95% de consultas exitosas en desarrollo en menos de 3 s cuando Brickset esté disponible  
**Constraints**: timeout upstream menor a los 5 s de Lambda; `pageSize` 1..500; sin secretos en código/logs/respuestas; sin reintentos automáticos; cuota individual Brickset de hasta 100 llamadas diarias  
**Scale/Scope**: una ruta pública de lectura con `query` y paginación; sin autenticación, caché, filtros avanzados ni persistencia

## Constitution Check

| Gate | Estado | Evidencia |
|---|---|---|
| Serverless y reproducible | Pasa | Lambda, HTTP API, IAM y configuración de secreto se declaran con SAM. |
| TypeScript estricto y validación | Pasa | Zod valida query params; DTOs explícitos aceptan nulos y opcionales. |
| Separación por capas | Pasa | handler → route → controller → service → repository → infraestructura. |
| Contrato estable | Pasa | Ruta `/v1`, OpenAPI y envelopes coherentes. |
| Seguridad por defecto | Pasa | Secreto JSON, ARN configurable, `GetSecretValue` mínimo y logs redactados. |
| Calidad verificable | Pasa | Unitarias, handler, contrato, tipo, lint, SAM validate y build. |
| Operación y cuota | Pasa | Timeout, mapeo seguro, observabilidad y ningún reintento ciego. |
| Simplicidad incremental | Pasa | No se añaden Cognito, DynamoDB ni caché. |

**Revisión posterior al diseño**: Pasa. No hay excepciones constitucionales.

## Project Structure

### Documentation (this feature)

```text
specs/001-search-brickset-sets/
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
├── handlers/get-sets.ts                   # Adaptador de evento Lambda
├── modules/sets/
│   ├── get-sets.route.ts                  # Despacho de ruta
│   ├── get-sets.controller.ts             # HTTP, validación y envelopes
│   ├── search-sets.service.ts             # Caso de uso
│   ├── brickset.repository.ts             # Puerto de catálogo externo
│   ├── brickset.client.ts                 # fetch, timeout y respuesta upstream
│   ├── brickset-secret.provider.ts        # Lectura y parsing del secreto
│   └── set.types.ts                       # DTOs y contratos internos
└── shared/http-response.ts                # Respuesta HTTP reutilizable

tests/
├── unit/modules/sets/
├── integration/handlers/get-sets.test.ts
└── contract/get-sets.contract.test.ts

template.yaml                              # Ruta, Lambda, parámetro ARN e IAM
```

**Structure Decision**: Se conserva el proyecto único y se añade un módulo de sets por capas. Los adapters AWS y Brickset permanecen en los extremos, permitiendo pruebas de negocio sin red ni Secrets Manager.

## Complexity Tracking

No hay violaciones constitucionales que requieran justificación.
