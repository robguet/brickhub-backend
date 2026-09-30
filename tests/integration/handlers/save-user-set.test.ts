import { describe, expect, it } from "vitest";

import { SavedSetsController } from "../../../src/modules/saved-sets/saved-sets.controller";
import { savedSetsRoute } from "../../../src/modules/saved-sets/saved-sets.route";
import { SavedSetsService } from "../../../src/modules/saved-sets/saved-sets.service";
import type { SavedSetRepository, SavedSetsList } from "../../../src/modules/saved-sets/saved-set.types";

const body = { destination: "collection", set: { setID: 51931, number: "30728", numberVariant: 1, name: "The Razor Crest", year: 2026, theme: "Star Wars", category: "Normal", released: true, pieces: 74 } };

function event(method: "GET" | "POST", sub?: string, value: unknown = body): never {
  return { body: method === "POST" ? JSON.stringify(value) : undefined, requestContext: { http: { method }, authorizer: sub === undefined ? undefined : { jwt: { claims: { sub } } } } } as never;
}

function controller(repository: SavedSetRepository): SavedSetsController {
  return new SavedSetsController(new SavedSetsService(repository));
}

describe("save user set handler", () => {
  it("rejects missing or empty authenticated subjects before persistence", async () => {
    let calls = 0;
    const repository: SavedSetRepository = { save: async (_user, set) => { calls += 1; return { savedSet: set, created: true }; }, list: async () => ({ collection: [], wishlist: [] }) };
    const instance = controller(repository);
    expect((await savedSetsRoute(event("POST", undefined), instance)).statusCode).toBe(401);
    expect((await savedSetsRoute(event("POST", "   "), instance)).statusCode).toBe(401);
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
    }, list: async () => ({ collection: [], wishlist: [] }) };
    const instance = controller(repository);
    const collection = await savedSetsRoute(event("POST", "user-a", body), instance);
    const wishlist = await savedSetsRoute(event("POST", "user-a", { ...body, destination: "wishlist" }), instance);
    expect(collection.statusCode).toBe(201);
    expect(wishlist.statusCode).toBe(200);
    expect(users).toEqual(["user-a", "user-a"]);
    expect(stored).toMatchObject({ destination: "wishlist", set: { setID: 51931 } });
    expect(collection.body).not.toContain("user-a");
  });

  it("preserves Brickset LEGO.com availability data when saving a set", async () => {
    let stored: Awaited<ReturnType<SavedSetRepository["save"]>>["savedSet"] | undefined;
    const repository: SavedSetRepository = {
      save: async (_user, savedSet) => { stored = savedSet; return { savedSet, created: true }; },
      list: async () => ({ collection: [], wishlist: [] }),
    };
    const value = {
      ...body,
      set: {
        ...body.set,
        LEGOCom: {
          US: {
            retailPrice: 259.99,
            dateFirstAvailable: "2010-09-02T00:00:00Z",
            dateLastAvailable: "2012-12-20T00:00:00Z",
          },
        },
      },
    };

    const response = await savedSetsRoute(event("POST", "user-a", value), controller(repository));

    expect(response.statusCode).toBe(201);
    expect(stored?.set.LEGOCom).toEqual(value.set.LEGOCom);
    expect(response.body).toContain('"LEGOCom"');
  });

  it("rejects a malicious userId without persistence", async () => {
    let calls = 0;
    const repository: SavedSetRepository = { save: async (_user, set) => { calls += 1; return { savedSet: set, created: true }; }, list: async () => ({ collection: [], wishlist: [] }) };
    const response = await savedSetsRoute(event("POST", "user-a", { ...body, userId: "user-b" }), controller(repository));
    expect(response.statusCode).toBe(400);
    expect(calls).toBe(0);
  });

  it("returns an idempotent response when the repository finds an existing set", async () => {
    const repository: SavedSetRepository = { save: async (_user, set) => ({ savedSet: { ...set, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }, created: false }), list: async () => ({ collection: [], wishlist: [] }) };
    const response = await savedSetsRoute(event("POST", "user-a"), controller(repository));
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('"created":false');
  });

  it("groups only the authenticated user's saved sets into both public lists", async () => {
    const userLists: Record<string, SavedSetsList> = {
      "user-a": {
        collection: [{ destination: "collection", set: body.set, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }],
        wishlist: [{ destination: "wishlist", set: { ...body.set, setID: 2 }, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }],
      },
      "user-b": { collection: [], wishlist: [{ destination: "wishlist", set: { ...body.set, setID: 3 }, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }] },
    };
    const repository: SavedSetRepository = {
      save: async (_user, set) => ({ savedSet: set, created: true }),
      list: async (user) => userLists[user.sub] ?? { collection: [], wishlist: [] },
    };
    const response = await savedSetsRoute(event("GET", "user-a"), controller(repository));
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('"collection"');
    expect(response.body).toContain('"wishlist"');
    expect(response.body).toContain('"setID":51931');
    expect(response.body).toContain('"setID":2');
    expect(response.body).not.toContain('"setID":3');
    expect(response.body).not.toContain("user-a");
    expect(response.body).not.toContain('"PK"');
  });

  it("returns empty arrays for a user with no saved sets", async () => {
    const repository: SavedSetRepository = { save: async (_user, set) => ({ savedSet: set, created: true }), list: async () => ({ collection: [], wishlist: [] }) };
    const response = await savedSetsRoute(event("GET", "new-user"), controller(repository));
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('"collection":[]');
    expect(response.body).toContain('"wishlist":[]');
  });

  it("rejects unauthenticated GET requests without calling persistence", async () => {
    let listCalls = 0;
    const repository: SavedSetRepository = { save: async (_user, set) => ({ savedSet: set, created: true }), list: async () => { listCalls += 1; return { collection: [], wishlist: [] }; } };
    expect((await savedSetsRoute(event("GET", undefined), controller(repository))).statusCode).toBe(401);
    expect((await savedSetsRoute(event("GET", "   "), controller(repository))).statusCode).toBe(401);
    expect(listCalls).toBe(0);
  });
});
