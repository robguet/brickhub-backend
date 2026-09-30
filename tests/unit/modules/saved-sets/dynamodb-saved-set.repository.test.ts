import { describe, expect, it } from "vitest";

import { DynamoDbSavedSetRepository } from "../../../../src/modules/saved-sets/dynamodb-saved-set.repository";

const savedSet = { destination: "wishlist" as const, set: { setID: 51931, number: "30728", numberVariant: 1, name: "Set", year: 2026, theme: "Theme", category: "Normal", released: true, pieces: 74, LEGOCom: { US: { retailPrice: 259.99, dateFirstAvailable: "2010-09-02T00:00:00Z", dateLastAvailable: "2012-12-20T00:00:00Z" } } }, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };

describe("DynamoDbSavedSetRepository", () => {
  it("writes a conditional item scoped to the authenticated user", async () => {
    const sent: Array<{ input: Record<string, unknown> }> = [];
    const client = { send: async (command: { input: Record<string, unknown> }) => { sent.push(command); return {}; } };
    const result = await new DynamoDbSavedSetRepository(client as never, "table").save({ sub: "a" }, savedSet);
    expect(result.created).toBe(true);
    expect(sent[0]?.input).toMatchObject({ ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)", Item: { PK: "USER#a", SK: "SAVED_SET#51931", entityType: "SAVED_SET" } });
    expect(sent[0]?.input.Item).toMatchObject({ set: { LEGOCom: { US: { retailPrice: 259.99 } } } });
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

  it("queries only the authenticated partition and groups valid saved snapshots", async () => {
    const sent: Array<{ input: Record<string, unknown> }> = [];
    const client = { send: async (command: { input: Record<string, unknown> }) => {
      sent.push(command);
      return { Items: [
        { PK: "USER#a", SK: "SAVED_SET#1", entityType: "SAVED_SET", ...savedSet },
        { PK: "USER#a", SK: "SAVED_SET#2", entityType: "SAVED_SET", ...savedSet, destination: "collection" },
        { PK: "USER#a", SK: "SAVED_SET#3", entityType: "SAVED_SET", ...savedSet, destination: "invalid" },
      ] };
    } };
    const result = await new DynamoDbSavedSetRepository(client as never, "table").list({ sub: "a" });
    expect(sent[0]?.input).toMatchObject({
      TableName: "table",
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: { ":pk": "USER#a", ":prefix": "SAVED_SET#" },
    });
    expect(result.collection).toHaveLength(1);
    expect(result.wishlist).toHaveLength(1);
    expect(JSON.stringify(result)).not.toContain('"PK"');
    expect(JSON.stringify(result)).not.toContain('"entityType"');
  });

  it("returns both empty arrays and follows every query page", async () => {
    const sent: Array<{ input: Record<string, unknown> }> = [];
    const client = { send: async (command: { input: Record<string, unknown> }) => {
      sent.push(command);
      return sent.length === 1
        ? { Items: [], LastEvaluatedKey: { PK: "USER#a", SK: "SAVED_SET#1" } }
        : { Items: [{ PK: "USER#a", SK: "SAVED_SET#2", entityType: "SAVED_SET", ...savedSet }] };
    } };
    const result = await new DynamoDbSavedSetRepository(client as never, "table").list({ sub: "a" });
    expect(sent).toHaveLength(2);
    expect(sent[1]?.input.ExclusiveStartKey).toEqual({ PK: "USER#a", SK: "SAVED_SET#1" });
    expect(result.collection).toEqual([]);
    expect(result.wishlist).toHaveLength(1);
  });
});
