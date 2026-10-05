import { expect, it, vi } from "vitest";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DynamoDbRadarRepository } from "../../../../src/modules/radar/dynamodb-radar.repository";
it("bounds queries, uses strong reads and preserves last evaluated key without scans", async () => {
  const pk = "FEED#RELEASES#MX"; const send = vi.fn().mockResolvedValue({ Items: [], LastEvaluatedKey: { PK: pk, SK: "2026-10-01#event" } });
  const result = await new DynamoDbRadarRepository({ send } as unknown as DynamoDBDocumentClient, "table").queryFeed({ pk, ascending: true, lower: "2026-10-01#", limit: 6, lastSk: "2026-10-01#a" }, new AbortController().signal);
  const input = send.mock.calls[0]?.[0].input;
  expect(input).toMatchObject({ ConsistentRead: true, ScanIndexForward: true, Limit: 6, ExclusiveStartKey: { PK: pk, SK: "2026-10-01#a" } });
  expect(input).not.toHaveProperty("FilterExpression"); expect(result.lastSk).toBe("2026-10-01#event");
});
