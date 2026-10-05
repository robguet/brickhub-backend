import { expect, it } from "vitest";
import { request } from "../fixtures/radar/http";
it("does not silently replace missing stored config with hardcoded content", async () => { expect((await request("/v1/radar/config")).statusCode).toBe(404); });
it("does not accept query fields on config", async () => { expect((await request("/v1/radar/config", "publish=true")).statusCode).toBe(400); });

import { prepared } from "../fixtures/radar/import-helper";
it("serves all copy/calendar labels without exposing source metadata", async () => {
  const entity = prepared().entities.find(value => value.kind === "config");
  if (entity?.kind !== "config") throw new Error("fixture");
  const result = await request("/v1/radar/config", "", { getConfig: async () => entity.value });
  expect(result.statusCode).toBe(200); const body = JSON.parse(result.body!);
  expect(body.data.config).toHaveProperty("copy.allArticlesLabel"); expect(body.data.config.calendar.weekdays).toHaveLength(7);
  expect(body.data.config).not.toHaveProperty("sourceHash"); expect(body.data.config).not.toHaveProperty("sourceReference");
});
