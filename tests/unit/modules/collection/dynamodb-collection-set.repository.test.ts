import { describe, expect, it } from "vitest";

import { DynamoDbCollectionSetRepository } from "../../../../src/modules/collection/dynamodb-collection-set.repository";

describe("DynamoDbCollectionSetRepository", () => {
  it("queries only the authenticated partition and emits an opaque cursor", async () => {
    const sent: Array<{ input: Record<string, unknown> }> = [];
    const documentClient = { send: async (command: { input: Record<string, unknown> }) => {
      sent.push(command);
      return { Items: [{ PK: "USER#a", SK: "SET#018f0c34-7abc-7def-8123-456789abcdef", entityType: "COLLECTION_SET", collectionSetId: "018f0c34-7abc-7def-8123-456789abcdef", catalogSetId: 1, quantity: 1, condition: "used", notes: null, acquiredOn: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }], LastEvaluatedKey: { SK: "SET#018f0c34-7abc-7def-8123-456789abcdef" } };
    } };
    const page = await new DynamoDbCollectionSetRepository(documentClient as never, "table").list({ sub: "a" }, 20);
    expect(sent[0]?.input.ExpressionAttributeValues).toMatchObject({ ":pk": "USER#a" });
    expect(page.items[0]).not.toHaveProperty("PK");
    expect(page.page.nextCursor).not.toContain("USER#a");
  });

  it("uses a user-scoped conditional key for update and maps conditional failures", async () => {
    const sent: Array<{ input: Record<string, unknown> }> = [];
    const documentClient = { send: async (command: { input: Record<string, unknown> }) => {
      sent.push(command);
      const error = new Error("missing");
      error.name = "ConditionalCheckFailedException";
      throw error;
    } };
    const result = await new DynamoDbCollectionSetRepository(documentClient as never, "table").update({ sub: "a" }, "018f0c34-7abc-7def-8123-456789abcdef", { quantity: 2 });
    expect(result).toBeUndefined();
    expect(sent[0]?.input.Key).toEqual({ PK: "USER#a", SK: "SET#018f0c34-7abc-7def-8123-456789abcdef" });
    expect(sent[0]?.input.ConditionExpression).toContain("attribute_exists");
  });
});
