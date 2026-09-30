import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("collection identity infrastructure", () => {
  it("declares verified email, public iOS client and JWT routes", () => {
    const template = readFileSync(resolve(process.cwd(), "template.yaml"), "utf8");
    expect(template).toContain("AutoVerifiedAttributes: [email]");
    expect(template).toContain("GenerateSecret: false");
    expect(template).toContain("AllowedOAuthFlows: [code]");
    expect(template).toContain("CognitoJwtAuthorizer");
    expect(template).toContain("SupportedIdentityProviders: [COGNITO]");
    expect(template).toContain("dynamodb:Query");
    expect(template).toContain("TableName: !Sub brickhub-${Environment}-user-data");
    expect(template).toContain("USER_DATA_TABLE_NAME: !Ref UserDataTable");
    expect(template).not.toContain("dynamodb:Scan");
  });
});
