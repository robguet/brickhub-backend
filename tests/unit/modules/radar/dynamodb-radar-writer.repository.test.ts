import { expect, it, vi } from "vitest";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DynamoDbRadarWriter, entityItems } from "../../../../src/modules/radar/dynamodb-radar.repository";
import { post } from "../../../fixtures/radar/helpers";
import { prepared } from "../../../fixtures/radar/import-helper";
import type { RadarEntity } from "../../../../src/modules/radar/radar.types";
it("removes old feed keys atomically when category, time and featured change", async () => {
  const old = post(); const changed = structuredClone(old);
  changed.meta.category = "top"; changed.meta.featured = false; changed.meta.publishedAt = "2026-07-21"; changed.meta.publishedSort = "2026-07-21T00:00:00.000Z"; changed.meta.version = 2; changed.detail.version = 2;
  const send = vi.fn().mockResolvedValue({});
  await new DynamoDbRadarWriter({ send } as unknown as DynamoDBDocumentClient, "table").write({ kind: "post", value: changed }, { kind: "post", value: old });
  const actions = send.mock.calls[0]?.[0].input.TransactItems;
  expect(actions.some((value: { Delete?: { Key: { PK: string } } }) => value.Delete?.Key.PK === "FEED#FEATURED")).toBe(true);
  const keys = actions.map((value: { Put?: { Item: { PK: string; SK: string } }; Delete?: { Key: { PK: string; SK: string } } }) => { const key = value.Put?.Item ?? value.Delete!.Key; return `${key.PK}:${key.SK}`; });
  expect(new Set(keys).size).toBe(keys.length);
  expect(actions.find((value: { Put?: { Item: { SK: string } } }) => value.Put?.Item.SK === "META").Put).toMatchObject({ ConditionExpression: "#version = :version", ExpressionAttributeValues: { ":version": 1 } });
});
it("retirement removes all feeds but retains the reserved slug", async () => {
  const previous = post(); const withdrawn = structuredClone(previous); withdrawn.meta.status = "withdrawn"; withdrawn.meta.version = 2; withdrawn.detail.version = 2;
  expect(entityItems({ kind: "post", value: withdrawn }).every(value => !value.PK.startsWith("FEED#"))).toBe(true);
  const send = vi.fn().mockResolvedValue({});
  await new DynamoDbRadarWriter({ send } as unknown as DynamoDBDocumentClient, "table").write({ kind: "post", value: withdrawn }, { kind: "post", value: previous });
  const actions = send.mock.calls[0]?.[0].input.TransactItems;
  expect(actions.some((value: { Put?: { Item: { PK: string } } }) => value.Put?.Item.PK === "SLUG#sample")).toBe(true);
});
it("rejects duplicate slug reservation and maps conditional cancellation to conflict", async () => {
  const send = vi.fn().mockResolvedValueOnce({ Item: { postId: "someone-else" } });
  const writer = new DynamoDbRadarWriter({ send } as unknown as DynamoDBDocumentClient, "table");
  await expect(writer.checkReservations({ kind: "post", value: post() })).rejects.toThrow("CONFLICT");
  send.mockRejectedValueOnce(Object.assign(new Error("cancelled"), { name: "TransactionCanceledException", CancellationReasons: [{ Code: "ConditionalCheckFailed" }] }));
  await expect(writer.write({ kind: "post", value: post() }, undefined)).rejects.toThrow("CONFLICT");
});
it("reprogramming a release replaces its natural reservation and both feeds", async () => {
  const initial = prepared().entities.find(value => value.kind === "release");
  if (initial?.kind !== "release") throw new Error("fixture");
  initial.value.editorialStatus = "published";
  const next: RadarEntity = structuredClone(initial); next.value.releaseDate = "2026-08-01"; next.value.version = 2;
  const send = vi.fn().mockResolvedValue({});
  await new DynamoDbRadarWriter({ send } as unknown as DynamoDBDocumentClient, "table").write(next, initial);
  const actions = send.mock.calls[0]?.[0].input.TransactItems;
  expect(actions.some((value: { Delete?: { Key: { PK: string } } }) => value.Delete?.Key.PK.includes("RELEASE_UNIQUE#MX#75383#2026-07-22"))).toBe(true);
  expect(actions.some((value: { Put?: { Item: { PK: string } } }) => value.Put?.Item.PK === "FEED#RELEASES#MX#2026-08")).toBe(true);
});
