import { expect, it } from "vitest";
import { request } from "../fixtures/radar/http";
import { post } from "../fixtures/radar/helpers";
it("defines summaries, null featured, and empty lists consistently", async () => {
  const value = post(); const result = await request("/v1/radar/posts", "limit=20", { queryFeed: async () => ({ items: [value.meta] }) });
  expect(result.statusCode).toBe(200); const body = JSON.parse(result.body!);
  expect(body.data.posts[0]).not.toHaveProperty("status"); expect(body.data.posts[0]).not.toHaveProperty("sourceReference");
  expect(body.data.page).toEqual({ limit: 20, nextCursor: null });
  expect(JSON.parse((await request("/v1/radar/featured")).body!).data).toEqual({ post: null });
});
it.each(["limit=0", "limit=51", "category=todos", "category=review", "limit=2&limit=3", "unexpected=true", "cursor=%25", "limit=1.5"])("rejects invalid query %s", async query => {
  expect((await request("/v1/radar/posts", query)).statusCode).toBe(400);
});
