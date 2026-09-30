# Implementation Plan: Perfil autenticado de usuario

**Branch**: `003-user-profile` | **Date**: 2026-09-27 | **Spec**: [spec.md](./spec.md)

## Summary

Añadir `PUT /v1/profile` para crear o devolver idempotentemente el perfil de quien acaba de iniciar sesión, y `GET /v1/profile` para restaurarlo en aperturas posteriores. Ambas rutas reutilizan el JWT authorizer actual y derivan la propiedad solo desde `sub`. Un módulo `profile` independiente almacena un ítem reservado en la tabla existente, con operaciones condicionales que garantizan un perfil único aun con inicios de sesión concurrentes.

## Technical Context

**Language/Version**: TypeScript 5.9; Node.js 24.x en Lambda  
**Primary Dependencies**: AWS SDK v3 DynamoDB Document Client; tipos AWS Lambda; Zod 4; AWS SAM  
**Storage**: Tabla DynamoDB `UserDataTable` compartida, con ítem de perfil reservado por partición
**Testing**: Vitest unitario, controller/handler y contrato; `npm run typecheck`, `npm run lint`, `npm test`, `sam validate --lint`, `sam build`  
**Target Platform**: API Gateway HTTP API y Lambda arm64; cliente iOS ya integrado con Cognito  
**Project Type**: Servicio web serverless  
**Performance Goals**: 95% de operaciones válidas en menos de 2 s en desarrollo  
**Constraints**: JWT Cognito access token; `sub` como única identidad; PUT valida correo, nombre visible y mercado; sin `Scan`; logs sin PII/token; un único perfil por identidad  
**Scale/Scope**: dos rutas privadas, una Lambda y módulo de perfil; sin edición de atributos personales, avatar o perfil público

## Constitution Check

| Gate | Estado | Evidencia |
|---|---|---|
| Serverless y reproducible | Pasa | Lambda, rutas, IAM y Log Group se declararán en SAM; reutiliza tabla y User Pool existentes. |
| TypeScript y capas | Pasa | handler → route → controller → service → repository → adaptador DynamoDB con tipos estrictos. |
| Contrato estable | Pasa | Rutas versionadas, OpenAPI y envelope consistente; se auditará DTO iOS antes de fijar campos adicionales. |
| Seguridad e integridad | Pasa | API Gateway valida JWT; la Lambda usa solo `sub`; claves DynamoDB y condiciones impiden duplicados. |
| Calidad y operación | Pasa | Pruebas sin AWS real, logs seguros, retención explícita y validaciones SAM/build. |
| Simplicidad y despliegue | Pasa | Sin nueva tabla, índice, proveedor o ambiente; no autoriza despliegue automático. |

**Revisión posterior al diseño**: Pasa. No requiere excepciones constitucionales.

## Project Structure

```text
src/
├── handlers/profile.ts
├── modules/profile/
│   ├── profile.types.ts
│   ├── profile.repository.ts
│   ├── dynamodb-profile.repository.ts
│   ├── profile.service.ts
│   ├── profile.controller.ts
│   └── profile.route.ts
└── shared/authenticated-user.ts             # Reutilizado

tests/
├── unit/modules/profile/
├── integration/handlers/profile.test.ts
└── contract/profile.contract.test.ts

template.yaml
```

**Structure Decision**: Un módulo independiente evita mezclar la semántica de sesión con colección. Se agrega una Lambda pequeña con solo `GetItem` y `PutItem` contra la tabla existente; su `SK = PROFILE` no puede aparecer en las consultas `SET#` de colección. El correo del body se trata como dato de perfil validado, mientras que `sub` sigue siendo la única clave de propiedad.

## Complexity Tracking

No hay violaciones constitucionales que requieran justificación.
