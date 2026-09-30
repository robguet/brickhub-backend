import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const contract = readFileSync(resolve(process.cwd(), "specs/005-save-user-set/contracts/openapi.yaml"), "utf8");
const template = readFileSync(resolve(process.cwd(), "template.yaml"), "utf8");

describe("saved sets API contract", () => {
  it("documents the protected idempotent endpoint and public envelopes", () => {
    expect(contract).toContain("/v1/saved-sets:");
    expect(contract).toContain("operationId: saveUserSet");
    expect(contract).toContain("security: [{ CognitoAccessToken: [] }]");
    expect(contract).toContain("bearerFormat: JWT");
    expect(contract).toContain("'201':");
    expect(contract).toContain("'200':");
    expect(contract).not.toContain("userId:");
    expect(contract).not.toContain("\n        PK:");
  });

  it("binds the SAM event to Cognito and grants only the required DynamoDB actions", () => {
    expect(template).toContain("SaveUserSetFunction:");
    expect(template).toContain("Path: /v1/saved-sets");
    expect(template).toContain("Auth: { Authorizer: CognitoJwtAuthorizer }");
    expect(template).toContain("Action: [dynamodb:PutItem, dynamodb:UpdateItem]");
    expect(template).toContain("SaveUserSetFunctionLogGroup:");
  });
});
