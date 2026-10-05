# Implementation Plan: Contenido persistente de Radar BrickHub

**Branch**: `main` (rama Git real; setup devuelve identificador lógico `011-radar-posts`) | **Date**: 2026-10-05 | **Spec**: [spec.md](spec.md)

**Input**: `specs/011-radar-posts/spec.md`

## Summary

Implementar lecturas autenticadas de configuración, publicaciones paginadas, destacado, detalle, videos y calendario. Persistir Radar en tabla independiente con META/CONTENT y feeds de resúmenes materializados transaccionalmente. Preparar CLI de importación con validación previa, deduplicación, reporte y control de versión. El usuario no tendrá que introducir registros manualmente: el agente puede ejecutar el importador en una fase posterior con destino y datos revisados.

La propuesta de dos GSIs queda sustituida por feeds en tabla base para lecturas fuertes y retiradas coherentes. Infraestructura incluye tabla DynamoDB y medios en S3 privado servido por CloudFront OAC. No se crean recursos ni se implementan cambios en esta fase.

## Technical Context

**Language/Version**: TypeScript 5.9 strict; runtime AWS Lambda Node.js 24 arm64 existente.

**Primary Dependencies**: AWS SDK v3 DynamoDB/DocumentClient, Zod 4; Vitest 4, ESLint 9 y AWS SAM existentes. CLI TypeScript compilada mediante esbuild existente, sin instalar framework.

**Storage**: Tabla Radar PK/SK on-demand sin índices secundarios, Retain/PITR; bucket de medios S3 privado y distribución CloudFront con OAC, claves bajo prefijo `radar/`. URLs HTTPS del CDN se guardan en contenido.

**Testing**: Unitarias de reglas/validación/importación/cursor; controller/handler con repositorio sustituible; contratos JSON y SAM; prueba de carga opt-in en dev tras autorización, aislada de suite unitaria.

**Target Platform**: API Gateway HTTP API, Cognito existente y una Lambda Radar, ambiente dev.

**Project Type**: Servicio backend y CLI administrativa.

**Performance Goals**: 10,000 posts, 50 lectores concurrentes, p95 <2 s para 20 tarjetas/detalle; cambios visibles <=60 s. Son metas sin medición todavía.

**Constraints**: Lecturas sin Scan, límite 50, plazo de I/O 4 s con abort real y Lambda 5 s; transacciones por entidad; máximo 350 KiB por ítem; sin publicación/despliegue automáticos; no acceso anónimo.

**Scale/Scope**: Nueve artículos de muestra, cuatro categorías, seis formatos, nueve bloques, cinco videos y cuatro eventos únicos. Lecturas e importación controlada de datos y medios, sin CMS ni escritura HTTP.

## Constitution Check

*GATE previo a investigación y posterior a diseño: PASS. Sin excepciones.*

| Principio | Evidencia de diseño | Pre / Post |
| --- | --- | --- |
| Serverless reproducible | Tabla, Lambda, eventos GET, log group y permisos en template.yaml; dev | PASS / PASS |
| TypeScript estricto | Tipos explícitos y Zod en fronteras HTTP, archivo e ítems DB | PASS / PASS |
| Capas | handler -> route -> controller -> service -> repository; import service independiente | PASS / PASS |
| Contratos estables | /v1, envelope existente; contrato Radar nuevo, no cambia rutas actuales | PASS / PASS |
| Seguridad | Cognito en cada evento; Bearer/sub validado antes de I/O; IAM lector separado del escritor | PASS / PASS |
| Integridad | Tabla editorial compartida, no particiones personales; transacciones y versiones | PASS / PASS |
| Calidad | Unitarias/contratos/handler, typecheck, lint, tests, sam validate y build en implementación | PASS / PASS |
| Observabilidad | Logs de ruta/requestId/duración/conteos; retención explícita 14 días; sin tokens/cuerpo/cursor | PASS / PASS |
| Simplicidad | Una tabla, una Lambda, cero GSI, CLI y CDN de medios; sin CMS, secreto nuevo ni scheduler | PASS / PASS |
| Despliegues | Ningún AWS apply en plan; change set y destino revisados antes de despliegue futuro | PASS / PASS |

## Project Structure

### Documentation (this feature)

```text
specs/011-radar-posts/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── storage-proposal.md                 # propuesta histórica; research prevalece
├── radar-normalized.example.json       # preparación, importReady=false
├── checklists/requirements.md
└── contracts/
    ├── radar-api.md
    └── radar-import.md
```

### Source Code (repository root; archivos previstos)

```text
src/handlers/radar.ts
src/modules/radar/
  radar.types.ts
  radar.schemas.ts
  radar.route.ts
  radar.controller.ts
  radar.service.ts
  radar.repository.ts
  dynamodb-radar.repository.ts
  radar.cursor.ts
  radar-import.service.ts
  radar-item-size.ts
scripts/radar-import.ts
scripts/radar-load-test.ts
tests/fixtures/radar/
tests/unit/modules/radar/
tests/contract/radar.contract.test.ts
tests/integration/handlers/radar.test.ts
template.yaml
package.json
```

**Structure Decision**: Seguir módulos existentes de amazon-offers y saved-sets; integración handler local con dependencias simuladas. No modificar frontend/iOS desde este repositorio.

## Design and delivery

1. Implementar esquemas, invariantes, cursor y transformaciones desde JSON original/intermedio a entidades canónicas. Tests de preservación de nueve posts y todos sus campos.
2. Implementar repositorio de lectura y escritor de importación separado, feeds y transacciones; una escritura por entidad, condicionada por versión. Query sin cuerpos ni filtros posteriores.
3. Exponer seis rutas GET; autenticación previa a dependencias, plazo de I/O compartido y errores seguros.
4. Declarar RadarTable/RadarFunction/LogGroup, bucket privado RadarMediaBucket, OriginAccessControl, CloudFront distribution/policy bucket y outputs RadarTableName/RadarBaseUrl/RadarMediaBaseUrl mediante SAM. Lector: GetItem, Query y TransactGetItems únicamente sobre RadarTable. Operador externo: GetItem, TransactGetItems y TransactWriteItems sobre tabla; DescribeTable para verificación. Ningún permiso de escritura en Lambda HTTP.
5. CLI dry-run predeterminado, apply revisable e idempotente, sin custom resource de seed. Preparación de bundle válido con manifiesto; borradores por defecto; publicación requiere lista explícita.
6. Cargar medios con MIME correcto, claves estables y URLs HTTPS; versionar cambios de imágenes o invalidar CloudFront cuando corresponda. IAM operador puede PutObject en prefijo `radar/`; lector HTTP no recibe permiso S3.
7. Verificar calidad automatizada y escenarios del quickstart. Prueba real de carga solo opt-in con fixtures identificables de dev y limpieza delimitada aprobada.

## Data loading responsibility

No es necesario que el usuario guarde datos manualmente. Durante implementación se entrega importador y bundle; primero valida/reporta sin escribir. Luego el agente puede aplicar en dev una vez autorizado el destino y revisado el reporte. Fecha editorial de 75383 resuelta: 22 de julio de 2026. Antes de publicar se necesita desplegar el bucket/CDN y definir qué posts publicar. La solicitud actual de planificación no despliega ni carga AWS.

## Quality evidence and limits

Este plan verifica consistencia documental; no acredita pruebas del backend aún inexistente. La revisión de compatibilidad con Radar iOS queda como paso de integración porque sus DTOs no están aquí. No hay `.specify/extensions.yml`: hooks before_plan/after_plan omitidos por ausencia. El comando termina tras investigación, modelo, contratos y quickstart; sigue `$speckit-tasks`.
