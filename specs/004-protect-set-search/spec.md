# Feature Specification: Protect Set Search

**Feature Branch**: `004-protect-set-search`  
**Created**: 2026-09-29  
**Status**: Draft  
**Input**: User description: "Agregar al endpoint `v1/sets?query=10212` que sea requerido un bearer token sino manda un error referente a ese."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Search with an authorized session (Priority: P1)

As a signed-in BrickHub user, I can search for LEGO sets after presenting my valid session credential, so that catalog search is available only to authenticated users.

**Why this priority**: This preserves the existing search experience for legitimate users while establishing the authentication boundary for the endpoint.

**Independent Test**: A signed-in user requests a set query with a valid credential and receives the same successful search result currently available to the client.

**Acceptance Scenarios**:

1. **Given** a user has a valid session credential, **When** they request `/v1/sets?query=10212` and present it as a Bearer credential, **Then** the search is processed and returns the established success response.

---

### User Story 2 - Reject unauthenticated searches (Priority: P1)

As the service owner, I need searches without a valid Bearer credential to be rejected safely, so that anonymous callers cannot consume the catalog-search integration.

**Why this priority**: It is the essential security outcome requested for the endpoint.

**Independent Test**: A request to `/v1/sets?query=10212` with no authorization credential is rejected before any catalog lookup is made.

**Acceptance Scenarios**:

1. **Given** a caller has not presented an authorization credential, **When** they request `/v1/sets?query=10212`, **Then** they receive an authentication error indicating that a Bearer credential is required.
2. **Given** a caller presents an expired, malformed, or untrusted Bearer credential, **When** they request `/v1/sets?query=10212`, **Then** they receive an authentication error without exposing credential contents or internal validation details.

### Edge Cases

- A request with an empty `Authorization` header, a scheme other than Bearer, or a whitespace-only credential is treated as unauthenticated.
- Authentication failures do not trigger a search or expose provider credentials, authorization headers, token contents, or internal validation details.
- Existing query validation continues to apply only after the caller is authenticated and authorized.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST require a Bearer session credential for every request to `/v1/sets`, including requests with a valid `query` value.
- **FR-002**: The system MUST accept a search request only when the credential is valid, current, and issued for BrickHub.
- **FR-003**: The system MUST return an authentication error for a missing, malformed, expired, or untrusted Bearer credential, and the response MUST clearly state that authentication is required without exposing sensitive validation details.
- **FR-004**: The system MUST not require a custom scope for a valid BrickHub credential to search sets.
- **FR-005**: The system MUST prevent catalog-search processing when authentication fails.
- **FR-006**: The system MUST preserve the existing successful response contract for authorized set-search requests.
- **FR-007**: The system MUST keep credentials, authorization headers, token values, and internal validation details out of client error responses and diagnostic logs.

### Key Entities

- **Bearer session credential**: A temporary credential presented by the signed-in client to prove its identity and permissions for a request.
- **Authentication error**: A safe response indicating that a valid Bearer credential is required or could not be accepted.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of requests to `/v1/sets` without a valid Bearer credential are rejected without returning catalog data.
- **SC-002**: 100% of authenticated requests to `/v1/sets?query=10212` retain the established successful search response contract.
- **SC-003**: 100% of rejected unauthenticated requests avoid invoking the catalog-search provider.
- **SC-004**: Authentication error responses expose no credential, token, provider-secret, or internal validation data.

## Assumptions

- BrickHub already has a session-issuing identity service used by other private API routes.
- The existing `query` parameter and successful response format remain unchanged.
- A missing or invalid credential is reported as an authentication failure.
- This feature only changes access control for `/v1/sets`; it does not alter account sign-in, session issuance, provider credentials, or catalog search behavior for authorized users.
