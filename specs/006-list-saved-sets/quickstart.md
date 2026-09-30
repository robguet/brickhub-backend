# Quickstart: Validate Saved-Set Listing

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

The tests must verify the protected GET contract in [openapi.yaml](contracts/openapi.yaml), the ownership and grouping rules in [data-model.md](data-model.md), and safe error behavior without live AWS resources.

## Manual validation after approved deployment

After an explicit deployment approval, call `GET /v1/saved-sets` with `Authorization: Bearer <access-token>` and no request body.

1. A user with a saved set in each destination receives HTTP 200 with `data.collection` and `data.wishlist`; each set is in only its matching list.
2. A user with no saved sets receives HTTP 200 with `data.collection: []` and `data.wishlist: []`.
3. A user with saved sets in one destination receives the other destination as `[]`.
4. A missing, expired, altered, or unauthorized Bearer credential receives HTTP 401 and no saved-set data.
5. A second user's token returns only that second user's saved sets.
6. A simulated repository failure returns HTTP 500 with the public `INTERNAL_ERROR` envelope and no internal storage details.

Do not log, commit, or share the access token used for manual validation.
