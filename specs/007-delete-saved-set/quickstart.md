# Quickstart: Validate Saved-Set Deletion

## Prerequisites

- Install dependencies with `npm ci`.
- Install AWS SAM CLI for validation and build only; automated validation does not access AWS.
- Use a Cognito Bearer access token only for an explicitly approved, post-deployment manual test in `dev`.

## Automated validation

From the repository root, run:

```bash
npm run typecheck
npm run lint
npm test
sam validate --lint
sam build
```

The tests must verify the protected DELETE contract in [openapi.yaml](contracts/openapi.yaml), the ownership and conditional-delete rules in [data-model.md](data-model.md), and safe error handling without live AWS resources.

## Manual validation after approved deployment

After explicit deployment approval, call `DELETE /v1/saved-sets/{setID}` with `Authorization: Bearer <access-token>` and no request body.

1. A user that saved a set with the selected `setID` receives HTTP 200 with `data.setID` and `data.deleted: true`; retrieving their lists no longer includes it.
2. A user with additional saved sets removes only the selected set; all other records remain unchanged.
3. The same set ID saved by a different user remains available to that other user after the first user deletes theirs.
4. A missing, expired, altered, or unauthorized Bearer credential receives HTTP 401 and deletes nothing.
5. An invalid, zero, negative, fractional, or non-numeric `setID` receives HTTP 400 and deletes nothing.
6. A repeated delete, an unknown set ID, or a set saved only by a different user receives HTTP 404 without revealing the other user's data.
7. A simulated repository failure receives HTTP 500 with the public `INTERNAL_ERROR` envelope and no DynamoDB, key, token, or claim details.

Do not log, commit, or share the access token used for manual validation.
