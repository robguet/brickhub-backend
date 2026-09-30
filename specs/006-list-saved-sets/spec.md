# Feature Specification: List Saved Sets

**Feature Branch**: `006-list-saved-sets`

**Created**: 2026-09-30

**Status**: Draft

**Input**: User description: "Create a secured endpoint that returns all saved sets for the authenticated user as separate collection and wishlist lists."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View my saved set lists (Priority: P1)

As an authenticated user, I want to retrieve my saved LEGO sets separated into my collection and wishlist so that I can view the sets I have and the sets I want.

**Why this priority**: Viewing the user's existing saved sets is the core value of the feature.

**Independent Test**: Can be fully tested by saving sets for one authenticated user in both destinations, requesting their saved sets with that user's valid credential, and verifying that each set is returned only in its matching list.

**Acceptance Scenarios**:

1. **Given** an authenticated user has saved sets whose destination is `collection`, **When** the user retrieves saved sets, **Then** those sets appear in the collection list.
2. **Given** an authenticated user has saved sets whose destination is `wishlist`, **When** the user retrieves saved sets, **Then** those sets appear in the wishlist list.
3. **Given** an authenticated user has saved sets in both destinations, **When** the user retrieves saved sets, **Then** the response contains two distinct lists and each saved set appears only in the list matching its destination.

---

### User Story 2 - Receive empty lists when no sets are saved (Priority: P2)

As an authenticated user with no saved sets, I want to receive usable empty collection and wishlist lists so that the app can display an empty state without treating it as an error.

**Why this priority**: New users must be able to retrieve their lists successfully before saving their first set.

**Independent Test**: Can be fully tested by retrieving saved sets for an authenticated user who has no saved-set records and verifying that both lists are empty.

**Acceptance Scenarios**:

1. **Given** an authenticated user has no saved sets, **When** the user retrieves saved sets, **Then** the request succeeds and returns an empty collection list and an empty wishlist list.
2. **Given** an authenticated user has saved sets only in one destination, **When** the user retrieves saved sets, **Then** the other destination is returned as an empty list.

---

### User Story 3 - Protect saved sets from other users (Priority: P3)

As a user, I want access to saved sets to be protected so that no one can retrieve my collection or wishlist without my authorization.

**Why this priority**: Saved-set lists are private account data and must remain isolated between users.

**Independent Test**: Can be fully tested with two users that have different saved sets, as well as missing and invalid credentials, and verifying the returned data or access denial.

**Acceptance Scenarios**:

1. **Given** a request does not include a valid Bearer credential, **When** it attempts to retrieve saved sets, **Then** the request is rejected and no saved-set data is returned.
2. **Given** two authenticated users have different saved sets, **When** either user retrieves saved sets, **Then** the response contains only that user's saved sets and never those of the other user.

### Edge Cases

- A user with no saved records receives two empty lists rather than a missing field or an error.
- A user with records in only one destination receives an empty list for the other destination.
- Records with a destination other than `collection` or `wishlist` are not included in either user-facing list and are handled safely without exposing internal record details.
- An expired, malformed, altered, or unauthorized Bearer credential does not reveal saved-set data.
- A server-side failure returns the product's safe, consistent API error response and does not expose internal details or data from any user.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a private, versioned operation that retrieves all saved LEGO sets belonging to the authenticated user.
- **FR-002**: The operation MUST require a valid Bearer credential and reject requests with a missing, invalid, expired, malformed, or unauthorized credential.
- **FR-003**: The system MUST determine the requesting user's identity exclusively from the authenticated credential and MUST NOT accept a client-supplied user identity as an authorization source.
- **FR-004**: The successful response MUST provide exactly two lists: `collection` and `wishlist`.
- **FR-005**: The `collection` list MUST contain only saved sets belonging to the authenticated user whose destination is `collection`.
- **FR-006**: The `wishlist` list MUST contain only saved sets belonging to the authenticated user whose destination is `wishlist`.
- **FR-007**: Each returned saved set MUST retain the set information stored for that saved record, including available identifiers, name, images, dates, theme information, availability, pieces, ratings, packaging, external link, barcode, and last-updated information.
- **FR-008**: The successful response MUST include both lists as arrays, including when either or both destinations have no saved sets.
- **FR-009**: The operation MUST ensure that a user cannot retrieve saved sets belonging to another user.
- **FR-010**: The operation MUST use the product's consistent success and error response envelopes and MUST NOT expose credentials, internal storage details, stack traces, or other sensitive information.
- **FR-011**: When the service cannot retrieve saved sets because of a server-side failure, the operation MUST return a safe, consistent server-error response.

### Key Entities *(include if feature involves data)*

- **Saved Set**: A LEGO set record saved by one authenticated user, containing the saved set's stored information and one destination.
- **Destination**: The exclusive saved-set classification, with the values `collection` or `wishlist`, used to place a saved set in the corresponding response list.
- **Authenticated Owner**: The user identified from a valid Bearer credential; this identity exclusively determines which saved sets may be returned.
- **Saved Set Lists Response**: The result presented to an authenticated user, containing separate collection and wishlist arrays.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In authorization tests with at least two users, 100% of successful retrievals return only records belonging to the authenticated user.
- **SC-002**: In destination-classification tests, 100% of saved sets with destination `collection` appear only in the collection list and 100% with destination `wishlist` appear only in the wishlist list.
- **SC-003**: In tests for users with no records or records in just one destination, 100% of successful responses include both collection and wishlist arrays, with empty arrays where appropriate.
- **SC-004**: 100% of requests without a valid Bearer credential are denied without returning saved-set data.
- **SC-005**: At least 95% of valid retrievals present both lists to the requesting user within 2 seconds under the service's normal development load.

## Assumptions

- Existing authentication verifies Bearer credentials and provides a unique authenticated user identity.
- A saved-set record belongs to the authenticated user when it is stored under that user's account partition.
- `destination` is the source of truth for separating saved sets, and only the values `collection` and `wishlist` are valid for user-facing saved-set lists.
- This feature retrieves existing saved sets only; saving, moving, editing, deleting, pagination, filtering, sorting, and importing sets are out of scope.
- The existing product conventions define the exact response-envelope and public error-message shapes.
