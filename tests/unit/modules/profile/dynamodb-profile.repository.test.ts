import { describe, expect, it } from "vitest";

import { DynamoDbProfileRepository } from "../../../../src/modules/profile/dynamodb-profile.repository";
import type { UserProfile } from "../../../../src/modules/profile/profile.types";

const profile: UserProfile = {
  userId: "018f0c34-7abc-7def-8123-456789abcdef", email: "ada@example.com", displayName: "Ada", defaultMarket: "MX",
  authProviders: ["cognito"], createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("DynamoDbProfileRepository", () => {
  it("uses only the authenticated sub in the DynamoDB profile key and maps public fields", async () => {
    const sent: Array<{ input: Record<string, unknown> }> = [];
    const client = { send: async (command: { input: Record<string, unknown> }) => { sent.push(command); return { Item: { PK: "USER#trusted", SK: "PROFILE", entityType: "USER_PROFILE", ...profile } }; } };
    const result = await new DynamoDbProfileRepository(client as never, "table").get({ sub: "trusted" });
    expect(sent[0]?.input).toMatchObject({ TableName: "table", Key: { PK: "USER#trusted", SK: "PROFILE" }, ConsistentRead: true });
    expect(result).toEqual(profile);
    expect(result).not.toHaveProperty("PK");
  });

  it("conditionally creates only the authenticated user's profile record", async () => {
    let input: Record<string, unknown> | undefined;
    const client = { send: async (command: { input: Record<string, unknown> }) => { input = command.input; return {}; } };
    const created = await new DynamoDbProfileRepository(client as never, "table").createIfAbsent({ sub: "trusted" }, profile);
    expect(created).toBe(true);
    expect(input).toMatchObject({
      TableName: "table", ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
      Item: { PK: "USER#trusted", SK: "PROFILE", entityType: "USER_PROFILE", ...profile },
    });
  });
});
