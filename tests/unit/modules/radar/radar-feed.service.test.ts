import { expect, it, vi } from "vitest";
import { RadarService, withRadarDeadline } from "../../../../src/modules/radar/radar.service";
import { decodeCursor } from "../../../../src/modules/radar/radar.cursor";
import { post, repository } from "../../../fixtures/radar/helpers";
it("keeps category and type independent, strips content, uses scoped continuation", async () => {
  const item = post("one", "lanzamiento"); item.meta.type = "guide";
  const query = vi.fn().mockResolvedValueOnce({ items: [item.meta] }).mockResolvedValueOnce({ items: [item.meta], lastSk: `${item.meta.publishedSort}#one` });
  const result = await new RadarService(repository({ queryFeed: query })).execute({ kind: "posts", category: "lanzamiento", limit: 2 });
  expect(result).toMatchObject({ posts: [{ category: "lanzamiento", type: "guide" }], page: { limit: 2 } });
  const data = result as { posts: Record<string, unknown>[]; page: { nextCursor: string } };
  expect(data.posts[0]).not.toHaveProperty("sourceHash"); expect(data.posts[0]).not.toHaveProperty("content");
  expect(() => decodeCursor(data.page.nextCursor, { kind: "posts", category: "rumor", limit: 2, direction: "desc" })).toThrow();
});
it("returns null for featured and preserves errors instead of returning empty", async () => {
  expect(await new RadarService(repository()).execute({ kind: "featured" })).toEqual({ post: null });
  await expect(new RadarService(repository({ queryFeed: async () => { throw new Error("private"); } })).execute({ kind: "posts", limit: 20 })).rejects.toThrow();
});
it("aborts all request I/O at the shared deadline", async () => {
  let signal: AbortSignal | undefined;
  await expect(withRadarDeadline(async value => { signal = value; return new Promise(() => {}); }, 5)).rejects.toThrow();
  expect(signal?.aborted).toBe(true);
});
it("rejects cursors that try to inject private partitions", () => {
  const cursor = Buffer.from(JSON.stringify({ v: 1, kind: "posts", limit: 20, direction: "desc", PK: "POST#draft", lastSk: "2026-07-20T00:00:00.000Z#sample", upperBound: "2026-10-05T12:00:00Z" })).toString("base64url");
  expect(() => decodeCursor(cursor, { kind: "posts", limit: 20, direction: "desc" })).toThrow();
});
