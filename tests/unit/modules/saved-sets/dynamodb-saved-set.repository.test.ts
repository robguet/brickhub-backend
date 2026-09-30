import { describe, expect, it } from "vitest";

import { DynamoDbSavedSetRepository } from "../../../../src/modules/saved-sets/dynamodb-saved-set.repository";

const savedSet = { destination: "wishlist" as const, set: { setID: 51931, number: "30728", numberVariant: 1, name: "Set", year: 2026, theme: "Theme", category: "Normal", released: true, pieces: 74 }, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };

describe("DynamoDbSavedSetRepository", () => {
  it("writes a conditional item scoped to the authenticated user", async () => {
    const sent: Array<{ input: Record<string, unknown> }> = [];
    const client = { send: async (command: { input: Record<string, unknown> }) => { sent.push(command); return {}; } };
    const result = await new DynamoDbSavedSetRepository(client as never, "table").save({ sub: "a" }, savedSet);
    expect(result.created).toBe(true);
    expect(sent[0]?.input).toMatchObject({ ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)", Item: { PK: "USER#a", SK: "SAVED_SET#51931", entityType: "SAVED_SET" } });
  });

  it("moves the existing set on the same authenticated key after a conditional conflict", async () => {
    const movedSet = { ...savedSet, destination: "collection" as const };
    const sent: Array<{ input: Record<string, unknown> }> = [];
    const client = { send: async (command: { input: Record<string, unknown> }) => {
      sent.push(command);
      if (sent.length === 1) { const error = new Error("exists"); error.name = "ConditionalCheckFailedException"; throw error; }
      return { Attributes: { PK: "USER#a", SK: "SAVED_SET#51931", entityType: "SAVED_SET", ...savedSet, destination: "collection" } };
    } };
    const result = await new DynamoDbSavedSetRepository(client as never, "table").save({ sub: "a" }, movedSet);
    expect(result).toMatchObject({ created: false, savedSet: { destination: "collection" } });
    expect(sent[1]?.input.Key).toEqual({ PK: "USER#a", SK: "SAVED_SET#51931" });
    expect(sent[1]?.input.UpdateExpression).toContain("destination = :destination");
  });
});
