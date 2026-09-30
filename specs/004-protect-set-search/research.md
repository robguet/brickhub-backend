# Research: Protect Set Search

## JWT validation at the HTTP API boundary

- **Decision**: Reuse the existing `CognitoJwtAuthorizer` on the `GET /v1/sets` route without custom scopes.
- **Rationale**: API Gateway's HTTP API JWT authorizer extracts the Bearer token and checks the issuer, signing key, audience or client ID, and token time claims before it invokes the Lambda. This provides the requested boundary without duplicating token parsing in the handler or exposing Brickset to unauthenticated traffic. [AWS API Gateway JWT authorizer documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html)
- **Alternatives considered**:
  - Validate the JWT in the Lambda: rejected because the function would run for invalid requests and token verification would be duplicated across routes.
  - Use a Lambda authorizer: rejected because the managed JWT authorizer already supplies issuer, audience/client-ID, signature, expiry, and scope validation for this route.
  - Leave the route public and add a client-side check: rejected because a mobile client is not an authorization boundary.

## Failure behavior and public contract

- **Decision**: Specify `401` for missing, malformed, expired, or untrusted Bearer credentials; expose no token or internal validation detail.
- **Rationale**: Gateway-generated failures must not be assumed to use an application-specific body, so the client contract treats status and absence of catalog data as authoritative while forbidding sensitive details.
- **Alternatives considered**:
  - Have Lambda manufacture authentication errors: rejected because authentication failures must stop before the catalog provider and Lambda.

## Verification approach

- **Decision**: Add repository-only contract assertions for the SAM event authorization and OpenAPI security/responses, then run typecheck, lint, tests, SAM validation, and SAM build.
- **Rationale**: The project constitution forbids automated unit tests from calling Cognito, Secrets Manager, or other real AWS services. Infrastructure-as-code assertions provide a stable regression check that `/v1/sets` remains protected.
- **Alternatives considered**:
  - Invoke a live endpoint in the test suite: rejected because it requires real credentials and is nondeterministic.
  - Test only handler behavior: rejected because JWT enforcement happens at API Gateway, outside the handler.
