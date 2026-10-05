import { expect, it } from "vitest";
import { request } from "../fixtures/radar/http";
import { post } from "../fixtures/radar/helpers";
it("returns detail with different cover and thumbnail, preserves optional absence", async () => {
  const value = post(); const result = await request("/v1/radar/posts/sample", "", { getPost: async () => value });
  const body = JSON.parse(result.body!); expect(result.statusCode).toBe(200);
  expect(body.data.post.coverImage).not.toEqual(body.data.post.thumbnail); expect(body.data.post.content).toEqual(value.detail.content);
  expect(body.data.post).not.toHaveProperty("postId"); expect(body.data.post).not.toHaveProperty("author");
});
it.each(["draft", "withdrawn"] as const)("returns 404 for %s", async status => {
  const value = post(); value.meta.status = status;
  expect((await request("/v1/radar/posts/sample", "", { getPost: async () => value })).statusCode).toBe(404);
});
it("does not expose internal error or confuse missing with broken data", async () => {
  expect((await request("/v1/radar/posts/missing")).statusCode).toBe(404);
  const result = await request("/v1/radar/posts/sample", "", { getPost: async () => { throw new Error("TABLE SECRET details"); } });
  expect(result.statusCode).toBe(500); expect(result.body).not.toContain("SECRET");
});

it("includes purchaseLinks in detail and preserves affiliate parameters", async () => {
  const value = post();
  value.detail.purchaseLinks = [{ store: "Amazon", link: "https://www.amazon.com.mx/dp/B0EXAMPLE?tag=example-20" }];
  const result = await request("/v1/radar/posts/sample", "", { getPost: async () => value });
  expect(result.statusCode).toBe(200);
  expect(JSON.parse(result.body!).data.post.purchaseLinks).toEqual(value.detail.purchaseLinks);
});
