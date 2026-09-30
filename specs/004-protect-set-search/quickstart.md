# Quickstart: Protect Set Search

## Prerequisites

- Node.js dependencies installed with `npm ci`.
- AWS SAM CLI installed for validation and build.
- The local source tree contains no real tokens or provider credentials.

## Automated validation

Run the repository checks:

```bash
npm run typecheck
npm run lint
npm test
sam validate --lint
sam build
```

All commands must succeed. The tests must use static infrastructure assertions or fakes only; they must not contact Cognito, API Gateway, Secrets Manager, Brickset, or DynamoDB.

## Contract checks

1. Inspect [contracts/openapi.yaml](contracts/openapi.yaml): `GET /v1/sets` declares Bearer JWT security and documents a safe `401` response.
2. Inspect `template.yaml`: the `SearchSets` HTTP API event uses the existing `CognitoJwtAuthorizer` without custom scopes.
3. Confirm existing successful responses and query validation are unchanged.

## Manual development-environment verification

After an approved development deployment, use only a non-production test account:

1. Call `GET /v1/sets?query=10212` without `Authorization`; expect `401` and no catalog result.
2. Call the same endpoint with an expired or malformed Bearer token; expect `401` and no token or validation details in the response or logs.
3. Call it with a valid Cognito access token; expect the existing search response format.
4. Review the Lambda and gateway logs for all cases: no `Authorization` header, JWT, token claims, Brickset API key, user hash, or secret value may appear.

Do not run deployment or live verification without an explicit review of the AWS account, region, and change set.
