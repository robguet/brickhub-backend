import { expect, it } from "vitest";
import { request } from "../fixtures/radar/http";
it.each(["month=2026-13", "month=2026-08&from=2026-08-01", "from=2026-02-30", "from=2026-07-22&from=2026-08-01"])("rejects incompatible/invalid calendar query %s", async query => {
  expect((await request("/v1/radar/releases", query)).statusCode).toBe(400);
});
it("keeps empty videos and calendar distinct from errors", async () => {
  expect(JSON.parse((await request("/v1/radar/videos")).body!).data.videos).toEqual([]);
  expect(JSON.parse((await request("/v1/radar/releases", "month=2026-08")).body!).data.releases).toEqual([]);
  expect((await request("/v1/radar/releases", "", { queryFeed: async () => { throw new Error("db"); } })).statusCode).toBe(500);
});

import { prepared } from "../fixtures/radar/import-helper";
it("rejects a draft video inserted into a public feed instead of exposing it", async () => {
  const draft = prepared().entities.find(value => value.kind === "video" && value.value.status === "draft");
  if (draft?.kind !== "video") throw new Error("fixture");
  const result = await request("/v1/radar/videos", "", { queryFeed: async () => ({ items: [draft.value] }) });
  expect(result.statusCode).toBe(500); expect(result.body).not.toContain(draft.value.title);
});
