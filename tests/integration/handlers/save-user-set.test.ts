import { describe, expect, it } from "vitest";

import { SavedSetsController } from "../../../src/modules/saved-sets/saved-sets.controller";
import { savedSetsRoute } from "../../../src/modules/saved-sets/saved-sets.route";
import { SavedSetsService } from "../../../src/modules/saved-sets/saved-sets.service";
import type { SavedSetRepository } from "../../../src/modules/saved-sets/saved-set.types";

const body = { destination: "collection", set: { setID: 51931, number: "30728", numberVariant: 1, name: "The Razor Crest", year: 2026, theme: "Star Wars", category: "Normal", released: true, pieces: 74 } };

function event(sub?: string, value: unknown = body): never {
  return { body: JSON.stringify(value), requestContext: { http: { method: "POST" }, authorizer: sub === undefined ? undefined : { jwt: { claims: { sub } } } } } as never;
}

function controller(repository: SavedSetRepository): SavedSetsController {
  return new SavedSetsController(new SavedSetsService(repository));
}

describe("save user set handler", () => {
  it("rejects missing or empty authenticated subjects before persistence", async () => {
    let calls = 0;
    const repository: SavedSetRepository = { save: async (_user, set) => { calls += 1; return { savedSet: set, created: true }; } };
    const instance = controller(repository);
    expect((await savedSetsRoute(event(undefined), instance)).statusCode).toBe(401);
    expect((await savedSetsRoute(event("   "), instance)).statusCode).toBe(401);
    expect(calls).toBe(0);
  });

  it("uses only the claim subject and moves a set between destinations without a second record", async () => {
    const users: string[] = [];
    let stored: Awaited<ReturnType<SavedSetRepository["save"]>>["savedSet"] | undefined;
    const repository: SavedSetRepository = { save: async (user, set) => {
      users.push(user.sub);
      const created = stored === undefined;
      stored = { ...set, createdAt: stored?.createdAt ?? set.createdAt };
      return { savedSet: stored, created };
    } };
    const instance = controller(repository);
    const collection = await savedSetsRoute(event("user-a", body), instance);
    const wishlist = await savedSetsRoute(event("user-a", { ...body, destination: "wishlist" }), instance);
    expect(collection.statusCode).toBe(201);
    expect(wishlist.statusCode).toBe(200);
    expect(users).toEqual(["user-a", "user-a"]);
    expect(stored).toMatchObject({ destination: "wishlist", set: { setID: 51931 } });
    expect(collection.body).not.toContain("user-a");
  });

  it("rejects a malicious userId without persistence", async () => {
    let calls = 0;
    const repository: SavedSetRepository = { save: async (_user, set) => { calls += 1; return { savedSet: set, created: true }; } };
    const response = await savedSetsRoute(event("user-a", { ...body, userId: "user-b" }), controller(repository));
    expect(response.statusCode).toBe(400);
    expect(calls).toBe(0);
  });

  it("returns an idempotent response when the repository finds an existing set", async () => {
    const repository: SavedSetRepository = { save: async (_user, set) => ({ savedSet: { ...set, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }, created: false }) };
    const response = await savedSetsRoute(event("user-a"), controller(repository));
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('"created":false');
  });
});
