import { describe, expect, it } from "vitest";

import { SavedSetsController } from "../../../src/modules/saved-sets/saved-sets.controller";
import { savedSetsRoute } from "../../../src/modules/saved-sets/saved-sets.route";
import { SavedSetsService } from "../../../src/modules/saved-sets/saved-sets.service";
import type { SavedSetRepository, SavedSetsList } from "../../../src/modules/saved-sets/saved-set.types";

const body = { destination: "collection", set: { setID: 51931, number: "30728", numberVariant: 1, name: "The Razor Crest", year: 2026, theme: "Star Wars", category: "Normal", released: true, pieces: 74 } };

function event(method: "GET" | "POST" | "DELETE", sub?: string, value: unknown = body, setID?: string): never {
  return {
    body: method === "POST" ? JSON.stringify(value) : undefined,
    pathParameters: setID === undefined ? undefined : { setID },
    requestContext: { http: { method }, authorizer: sub === undefined ? undefined : { jwt: { claims: { sub } } } },
  } as never;
}

function repository(overrides: Partial<SavedSetRepository> = {}): SavedSetRepository {
  return {
    save: async (_user, savedSet) => ({ savedSet, created: true }),
    list: async () => ({ collection: [], wishlist: [] }),
    delete: async () => false,
    ...overrides,
  };
}

function controller(instanceRepository: SavedSetRepository): SavedSetsController {
  return new SavedSetsController(new SavedSetsService(instanceRepository));
}

describe("saved sets handler", () => {
  it("rejects missing or empty authenticated subjects before persistence", async () => {
    let calls = 0;
    const instance = controller(repository({ save: async (_user, savedSet) => { calls += 1; return { savedSet, created: true }; } }));
    expect((await savedSetsRoute(event("POST", undefined), instance)).statusCode).toBe(401);
    expect((await savedSetsRoute(event("POST", "   "), instance)).statusCode).toBe(401);
    expect(calls).toBe(0);
  });

  it("uses only the claim subject and moves a set between destinations without a second record", async () => {
    const users: string[] = [];
    let stored: Awaited<ReturnType<SavedSetRepository["save"]>>["savedSet"] | undefined;
    const instance = controller(repository({ save: async (user, savedSet) => {
      users.push(user.sub);
      const created = stored === undefined;
      stored = { ...savedSet, createdAt: stored?.createdAt ?? savedSet.createdAt };
      return { savedSet: stored, created };
    } }));
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
    const value = { ...body, set: { ...body.set, LEGOCom: { US: { retailPrice: 259.99, dateFirstAvailable: "2010-09-02T00:00:00Z", dateLastAvailable: "2012-12-20T00:00:00Z" } } } };
    const response = await savedSetsRoute(event("POST", "user-a", value), controller(repository({ save: async (_user, savedSet) => { stored = savedSet; return { savedSet, created: true }; } })));
    expect(response.statusCode).toBe(201);
    expect(stored?.set.LEGOCom).toEqual(value.set.LEGOCom);
    expect(response.body).toContain('"LEGOCom"');
  });

  it("rejects a malicious userId without persistence", async () => {
    let calls = 0;
    const response = await savedSetsRoute(event("POST", "user-a", { ...body, userId: "user-b" }), controller(repository({ save: async (_user, savedSet) => { calls += 1; return { savedSet, created: true }; } })));
    expect(response.statusCode).toBe(400);
    expect(calls).toBe(0);
  });

  it("returns an idempotent response when the repository finds an existing set", async () => {
    const response = await savedSetsRoute(event("POST", "user-a"), controller(repository({ save: async (_user, savedSet) => ({ savedSet: { ...savedSet, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }, created: false }) })));
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('"created":false');
  });

  it("groups only the authenticated user's saved sets into both public lists", async () => {
    const userLists: Record<string, SavedSetsList> = {
      "user-a": { collection: [{ destination: "collection", set: body.set, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }], wishlist: [{ destination: "wishlist", set: { ...body.set, setID: 2 }, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }] },
      "user-b": { collection: [], wishlist: [{ destination: "wishlist", set: { ...body.set, setID: 3 }, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }] },
    };
    const response = await savedSetsRoute(event("GET", "user-a"), controller(repository({ list: async (user) => userLists[user.sub] ?? { collection: [], wishlist: [] } })));
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('"setID":51931');
    expect(response.body).toContain('"setID":2');
    expect(response.body).not.toContain('"setID":3');
    expect(response.body).not.toContain('"PK"');
  });

  it("returns empty arrays for a user with no saved sets", async () => {
    const response = await savedSetsRoute(event("GET", "new-user"), controller(repository()));
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('"collection":[]');
    expect(response.body).toContain('"wishlist":[]');
  });

  it("rejects unauthenticated GET requests without calling persistence", async () => {
    let listCalls = 0;
    const instance = controller(repository({ list: async () => { listCalls += 1; return { collection: [], wishlist: [] }; } }));
    expect((await savedSetsRoute(event("GET", undefined), instance)).statusCode).toBe(401);
    expect((await savedSetsRoute(event("GET", "   "), instance)).statusCode).toBe(401);
    expect(listCalls).toBe(0);
  });

  it("deletes the selected saved set from either destination and preserves other records", async () => {
    const userASets = new Set([51931, 2]);
    const userBSets = new Set([51931]);
    const savedByUser: Record<string, Set<number>> = { "user-a": userASets, "user-b": userBSets };
    const instance = controller(repository({ delete: async (user, setID) => savedByUser[user.sub]?.delete(setID) ?? false }));
    const collection = await savedSetsRoute(event("DELETE", "user-a", undefined, "51931"), instance);
    expect(collection.statusCode).toBe(200);
    expect(collection.body).toContain('"setID":51931');
    expect(userASets).toEqual(new Set([2]));
    userASets.add(51931);
    const wishlist = await savedSetsRoute(event("DELETE", "user-a", undefined, "51931"), instance);
    expect(wishlist.statusCode).toBe(200);
    expect(userBSets).toEqual(new Set([51931]));
  });

  it("returns the same not-found response for a missing or another user's saved set", async () => {
    const savedByUser: Record<string, Set<number>> = { "user-a": new Set<number>(), "user-b": new Set([51931]) };
    const instance = controller(repository({ delete: async (user, setID) => savedByUser[user.sub]?.delete(setID) ?? false }));
    const missing = await savedSetsRoute(event("DELETE", "user-a", undefined, "51931"), instance);
    const foreign = await savedSetsRoute(event("DELETE", "user-a", undefined, "51931"), instance);
    expect(missing.statusCode).toBe(404);
    expect(foreign.statusCode).toBe(404);
    expect(missing.body).toBe(foreign.body);
    expect(savedByUser["user-b"]).toEqual(new Set([51931]));
  });

  it("rejects invalid or unauthenticated DELETE requests before repository deletion", async () => {
    let calls = 0;
    const instance = controller(repository({ delete: async () => { calls += 1; return true; } }));
    expect((await savedSetsRoute(event("DELETE", "user-a", undefined, "0"), instance)).statusCode).toBe(400);
    expect((await savedSetsRoute(event("DELETE", undefined, undefined, "51931"), instance)).statusCode).toBe(401);
    expect((await savedSetsRoute(event("DELETE", "   ", undefined, "51931"), instance)).statusCode).toBe(401);
    expect(calls).toBe(0);
  });
});
