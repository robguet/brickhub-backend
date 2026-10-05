import { expect, it } from "vitest";
import { blockSchema, civilDate, postSchema } from "../../../../src/modules/radar/radar.schemas";
import { assertItemSize } from "../../../../src/modules/radar/radar-item-size";
import { post } from "../../../fixtures/radar/helpers";
it("rejects impossible dates and conflicting ratings", () => {
  expect(civilDate.safeParse("2026-02-31").success).toBe(false);
  const value = post(); value.meta.rating = 9; value.detail.content.push({ type: "rating", score: 8, maxScore: 10, label: "BrickHub", summary: "Reseña" });
  expect(postSchema.safeParse(value).success).toBe(false);
});
it("rejects unknown blocks and repeated rankings", () => {
  expect(blockSchema.safeParse({ type: "html", text: "<script>" }).success).toBe(false);
  const item = { position: 1, setNumber: "75313", name: "ATAT", image: "https://media.example.com/a.png", description: "Set" };
  expect(blockSchema.safeParse({ type: "setRanking", title: "Top", items: [item, item] }).success).toBe(false);
});
it("preserves optional absence, cover distinct from thumbnail, and rejects oversized multibyte content", () => {
  const parsed = postSchema.parse(post()); expect(parsed.detail).not.toHaveProperty("author"); expect(parsed.detail.coverImage).not.toEqual(parsed.meta.thumbnail);
  expect(() => assertItemSize({ PK: "a", SK: "b", text: "🧱".repeat(100_000) })).toThrow();
});
