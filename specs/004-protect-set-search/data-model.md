# Data Model: Protect Set Search

This feature creates no persistent data. It defines authorization inputs and outcomes at the request boundary.

## Bearer access token

| Field | Source | Validation | Exposure |
|---|---|---|---|
| Credential scheme | `Authorization` request header | Must be Bearer | Never log or return its value |
| Issuer | Token claim | Must match the configured BrickHub user pool | Not returned |
| Audience or client ID | Token claim | Must identify the configured BrickHub iOS client | Not returned |
| Expiry and signature | Token claims/signature | Must be current and verifiable against the issuer keys | Not returned |

## Authorization outcomes

| Outcome | Condition | HTTP result | Catalog lookup |
|---|---|---:|---|
| Authorized | Valid Bearer access token | 200 or existing search error | May proceed |
| Unauthenticated | Header is absent/malformed or token is invalid, expired, untrusted, or does not match the client | 401 | Must not proceed |

## Response boundary

The error envelope is `{ "status": "error", "code": string, "message": string }`. It must not include the header, token, claims, credential values, signing/issuer diagnostics, provider credentials, or catalog data.
