import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const contract = readFileSync(resolve(process.cwd(), "specs/003-user-profile/contracts/openapi.yaml"), "utf8");

describe("profile API contract", () => {
  it("defines protected GET and PUT endpoints with the iOS DTO", () => {
    expect(contract).toContain("/v1/profile:");
    expect(contract).toContain("operationId: getProfile");
    expect(contract).toContain("operationId: initializeProfile");
    expect(contract).toContain("required: [email, displayName, defaultMarket]");
    expect(contract).toContain("required: [userId, email, displayName, defaultMarket, authProviders, createdAt, updatedAt]");
    expect(contract).toContain("CognitoAccessToken: { type: http, scheme: bearer");
  });

  it("does not model JWT ownership as request or response data", () => {
    expect(contract).not.toContain("\n        sub:");
    expect(contract).not.toContain("\n        PK:");
    expect(contract).not.toContain("\n        SK:");
  });
});
