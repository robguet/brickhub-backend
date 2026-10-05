import { expect, it, vi } from "vitest";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DynamoDbRadarRepository } from "../../../../src/modules/radar/dynamodb-radar.repository";
import { post } from "../../../fixtures/radar/helpers";
it("looks up slug strongly then gets META and CONTENT atomically", async () => {
  const value = post(); const send = vi.fn().mockResolvedValueOnce({ Item: { postId: "sample" } }).mockResolvedValueOnce({ Responses: [{ Item: value.meta }, { Item: value.detail }] });
  const repo = new DynamoDbRadarRepository({ send } as unknown as DynamoDBDocumentClient, "table");
  expect(await repo.getPost("sample", new AbortController().signal)).toEqual(value);
  expect(send.mock.calls[0]?.[0].input.ConsistentRead).toBe(true);
  expect(send.mock.calls[1]?.[0].input.TransactItems).toHaveLength(2);
});
it("rejects a torn detail version rather than leaking partial content", async () => {
  const value = post(); const send = vi.fn().mockResolvedValueOnce({ Item: { postId: "sample" } }).mockResolvedValueOnce({ Responses: [{ Item: value.meta }, { Item: { ...value.detail, version: 2 } }] });
  await expect(new DynamoDbRadarRepository({ send } as unknown as DynamoDBDocumentClient, "table").getPost("sample", new AbortController().signal)).rejects.toThrow();
});
