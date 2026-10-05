import { expect, it, vi } from "vitest";
import { event } from "../../fixtures/radar/http";
import { radarRoute } from "../../../src/modules/radar/radar.route";
it.each([undefined, "Bearer x,y", "Basic x", "Bearer", "Bearer x x"])("rejects invalid authentication before constructing I/O dependencies", async authorization => {
  const e = event("/v1/radar/posts"); e.headers = { authorization }; const createController = vi.fn();
  expect((await radarRoute(e, { createController, log: () => {} })).statusCode).toBe(401); expect(createController).not.toHaveBeenCalled();
});
it("rejects duplicate headers and absent verified sub", async () => {
  const e = event("/v1/radar/posts"); e.headers.Authorization = "Bearer second";
  expect((await radarRoute(e, { log: () => {} })).statusCode).toBe(401);
  const noSub = event("/v1/radar/posts"); delete (noSub.requestContext as typeof noSub.requestContext & { authorizer?: unknown }).authorizer;
  expect((await radarRoute(noSub, { log: () => {} })).statusCode).toBe(401);
});
it("logs operational context without token or arbitrary body", async () => {
  const e = event("/v1/radar/posts"); const log = vi.fn(); delete e.headers.authorization;
  await radarRoute(e, { log }); const serialized = JSON.stringify(log.mock.calls);
  expect(serialized).toContain("radar-fixture"); expect(serialized).not.toContain("fixture-token"); expect(serialized).not.toContain("authorization");
});
