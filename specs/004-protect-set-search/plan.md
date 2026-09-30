# Implementation Plan: Protect Set Search

**Branch**: `004-protect-set-search` | **Date**: 2026-09-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-protect-set-search/spec.md`

## Summary

Require a valid Cognito Bearer access token before `GET /v1/sets` can invoke the existing Brickset search Lambda. Extend the existing HTTP API JWT authorizer to the search route, document the safe `401` response in the public contract, and add infrastructure/contract regression tests. No changes are required to the search handler, Secrets Manager integration, or Brickset request path.

## Technical Context

**Language/Version**: TypeScript (strict), Node.js 24 Lambda runtime

**Primary Dependencies**: AWS SAM, API Gateway HTTP API JWT authorizer, Amazon Cognito User Pools, Vitest, Zod, AWS Lambda Powertools Parameters

**Storage**: N/A for authorization; existing AWS Secrets Manager read for Brickset credentials remains unchanged

**Testing**: Vitest contract/unit suite; `sam validate --lint`; SAM build

**Target Platform**: AWS Lambda behind API Gateway HTTP API; BrickHub iOS client

**Project Type**: Serverless web service

**Performance Goals**: Unauthorized requests are denied at the gateway without Lambda or Brickset work; authorized searches retain the existing 5-second Lambda timeout.

**Constraints**: `/v1` contract compatibility; Bearer access token only; no custom scopes; no token/header/secret leakage; least-privilege IAM unchanged; no real AWS calls in automated tests.

**Scale/Scope**: One existing `GET /v1/sets` route, its OpenAPI contract, and its infrastructure contract coverage. Sign-in, token issuance, user management, Brickset credentials, and search behavior for authorized callers are out of scope.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Result | Evidence |
|---|---|---|
| Serverless and reproducible | Pass | The existing SAM HTTP API and Cognito authorizer are reused; no console-only resource or manual security configuration is introduced. |
| TypeScript strict and layered design | Pass | Authorization remains at the gateway boundary, so handler, route, controller, repository, and provider layers do not acquire auth logic. |
| Stable API contract | Pass | Success response and query parameters are unchanged; the OpenAPI contract adds explicit Bearer security and safe `401`/`403` responses. |
| Secure by default | Pass | Gateway validates issuer, audience/client ID, signature, expiry, and route scope before Lambda execution. Secrets and token values remain outside responses and logs. |
| Verifiable quality | Pass | Contract assertions inspect the SAM authorization binding and public contract; unit suites do not call AWS, Cognito, or Brickset. |
| Controlled deployment | Pass | This plan contains no deployment action. A future deployment requires destination review and approval. |

## Project Structure

### Documentation (this feature)

```text
specs/004-protect-set-search/
├── plan.md              # This file ($speckit-plan command output)
├── research.md          # Phase 0 output ($speckit-plan command)
├── data-model.md        # Phase 1 output ($speckit-plan command)
├── quickstart.md        # Phase 1 output ($speckit-plan command)
├── contracts/           # Phase 1 output ($speckit-plan command)
└── tasks.md             # Phase 2 output ($speckit-tasks command - NOT created by $speckit-plan)
```

### Source Code (repository root)

```text
src/
├── handlers/get-sets.ts
├── modules/sets/
│   ├── get-sets.route.ts
│   ├── brickset.repository.ts
│   └── brickset-secret.provider.ts
└── shared/

tests/
├── contract/
│   ├── cognito-collection.contract.test.ts
│   └── sets.contract.test.ts
└── unit/modules/sets/

template.yaml
```

**Structure Decision**: Keep the existing single serverless project. The feature is declarative route authorization in `template.yaml`, with contract changes and regression tests. No source-layer modification is necessary because API Gateway rejects unauthenticated traffic before the existing search handler runs.

## Complexity Tracking

No constitution violations or complexity exceptions are required.
