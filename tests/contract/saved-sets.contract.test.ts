import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const saveContract = readFileSync(resolve(process.cwd(), "specs/005-save-user-set/contracts/openapi.yaml"), "utf8");
const listContract = readFileSync(resolve(process.cwd(), "specs/006-list-saved-sets/contracts/openapi.yaml"), "utf8");
const template = readFileSync(resolve(process.cwd(), "template.yaml"), "utf8");

describe("saved sets API contract", () => {
  it("documents the protected idempotent endpoint and public envelopes", () => {
    expect(saveContract).toContain("/v1/saved-sets:");
    expect(saveContract).toContain("operationId: saveUserSet");
    expect(saveContract).toContain("security: [{ CognitoAccessToken: [] }]");
    expect(saveContract).toContain("bearerFormat: JWT");
    expect(saveContract).toContain("'201':");
    expect(saveContract).toContain("'200':");
    expect(saveContract).not.toContain("userId:");
    expect(saveContract).not.toContain("\n        PK:");
  });

  it("documents the protected saved-set list with two always-present arrays", () => {
    expect(listContract).toContain("/v1/saved-sets:");
    expect(listContract).toContain("operationId: listSavedSets");
    expect(listContract).toContain("security: [{ CognitoAccessToken: [] }]");
    expect(listContract).toContain("bearerFormat: JWT");
    expect(listContract).toContain("'200':");
    expect(listContract).toContain("required: [collection, wishlist]");
    expect(listContract).toContain("'401':");
    expect(listContract).toContain("'500':");
    expect(listContract).not.toContain("userId:");
    expect(listContract).not.toContain("\n        PK:");
  });

  it("binds the SAM event to Cognito and grants only the required DynamoDB actions", () => {
    expect(template).toContain("SaveUserSetFunction:");
    expect(template).toContain("ListSavedSets:");
    expect(template).toContain("Path: /v1/saved-sets");
    expect(template).toContain("Auth: { Authorizer: CognitoJwtAuthorizer }");
    expect(template).toContain("Method: GET");
    expect(template).toContain("Action: [dynamodb:PutItem, dynamodb:UpdateItem, dynamodb:Query]");
    expect(template).not.toContain("dynamodb:Scan");
    expect(template).toContain("SaveUserSetFunctionLogGroup:");
  });
});
