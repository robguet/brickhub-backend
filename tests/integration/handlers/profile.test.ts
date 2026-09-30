import { describe, expect, it } from "vitest";

import { ProfileController } from "../../../src/modules/profile/profile.controller";
import { profileRoute } from "../../../src/modules/profile/profile.route";
import { ProfileService } from "../../../src/modules/profile/profile.service";
import type { ProfileRepository, UserProfile } from "../../../src/modules/profile/profile.types";

function event(method: string, sub?: string, body?: unknown): never {
  return { body: body === undefined ? undefined : JSON.stringify(body), requestContext: { http: { method }, authorizer: sub === undefined ? undefined : { jwt: { claims: { sub } } } } } as never;
}

function controller(): ProfileController {
  const profiles = new Map<string, UserProfile>();
  const repository: ProfileRepository = {
    get: async (user) => profiles.get(user.sub),
    createIfAbsent: async (user, profile) => { if (profiles.has(user.sub)) return false; profiles.set(user.sub, profile); return true; },
  };
  return new ProfileController(new ProfileService(repository));
}

describe("profile handler", () => {
  it("rejects requests without the JWT sub before persistence", async () => {
    const response = await profileRoute(event("GET"), controller());
    expect(response.statusCode).toBe(401);
    expect(response.body).toContain("UNAUTHENTICATED");
  });

  it("uses only the authenticated sub to isolate PUT and GET", async () => {
    const instance = controller();
    const input = { email: "ada@example.com", displayName: "Ada", defaultMarket: "MX" };
    const put = await profileRoute(event("PUT", "user-a", input), instance);
    const getA = await profileRoute(event("GET", "user-a"), instance);
    const getB = await profileRoute(event("GET", "user-b"), instance);
    expect(put.statusCode).toBe(200);
    expect(put.body).toContain('"created":true');
    expect(put.body).not.toContain("user-a");
    expect(getA.statusCode).toBe(200);
    expect(getB.statusCode).toBe(404);
  });

  it("rejects forged ownership fields", async () => {
    const response = await profileRoute(event("PUT", "user-a", { email: "ada@example.com", displayName: "Ada", defaultMarket: "MX", sub: "user-b" }), controller());
    expect(response.statusCode).toBe(400);
  });
});
