import { describe, expect, it } from "vitest";

import { collectionSetsRoute } from "../../../src/modules/collection/collection-sets.route";
import { CollectionSetsController } from "../../../src/modules/collection/collection-sets.controller";
import { CollectionSetsService } from "../../../src/modules/collection/collection-sets.service";
import type { CollectionSet, CollectionSetRepository } from "../../../src/modules/collection/collection-set.types";

function event(method: string, sub?: string, body?: unknown, collectionSetId?: string): never {
  return {
    body: body === undefined ? undefined : JSON.stringify(body),
    pathParameters: collectionSetId === undefined ? undefined : { collectionSetId },
    requestContext: { http: { method }, authorizer: sub === undefined ? undefined : { jwt: { claims: { sub } } } },
  } as never;
}

function controller(repository: CollectionSetRepository): CollectionSetsController {
  return new CollectionSetsController(new CollectionSetsService(repository));
}

describe("collection sets handler", () => {
  it("rejects an event without an authenticated sub before accessing persistence", async () => {
    const response = await collectionSetsRoute({ requestContext: { http: { method: "GET" } } } as never);
    expect(response.statusCode).toBe(401);
    expect(response.body).toContain("UNAUTHENTICATED");
  });

  it("derives create ownership from claims and never exposes it", async () => {
    let persistedBy: string | undefined;
    const repository: CollectionSetRepository = {
      list: async () => ({ items: [], page: { limit: 20, nextCursor: null } }),
      create: async (user, set) => { persistedBy = user.sub; return set; }, update: async () => undefined, delete: async () => false,
    };
    const response = await collectionSetsRoute(event("POST", "user-a", { catalogSetId: 1, userId: "user-b" }), controller(repository));
    expect(response.statusCode).toBe(400);
    expect(persistedBy).toBeUndefined();
  });

  it("keeps created sets inside the authenticated user collection", async () => {
    const items = new Map<string, CollectionSet[]>();
    const repository: CollectionSetRepository = {
      list: async (user, limit) => ({ items: items.get(user.sub) ?? [], page: { limit, nextCursor: null } }),
      create: async (user, set) => { items.set(user.sub, [...(items.get(user.sub) ?? []), set]); return set; },
      update: async () => undefined, delete: async () => false,
    };
    const instance = controller(repository);
    const create = await collectionSetsRoute(event("POST", "user-a", { catalogSetId: 1 }), instance);
    const listA = await collectionSetsRoute(event("GET", "user-a"), instance);
    const listB = await collectionSetsRoute(event("GET", "user-b"), instance);
    expect(create.statusCode).toBe(201);
    expect(listA.body).toContain("catalogSetId");
    expect(listA.body).not.toContain("user-a");
    expect(listB.body).toContain('"items":[]');
  });

  it("returns the same 404 for foreign and missing sets", async () => {
    const id = "018f0c34-7abc-7def-8123-456789abcdef";
    const repository: CollectionSetRepository = {
      list: async () => ({ items: [] as CollectionSet[], page: { limit: 20, nextCursor: null } }), create: async (_user, set) => set,
      update: async () => undefined, delete: async () => false,
    };
    const instance = controller(repository);
    const foreign = await collectionSetsRoute(event("PATCH", "user-b", { quantity: 2 }, id), instance);
    const missing = await collectionSetsRoute(event("PATCH", "user-b", { quantity: 2 }, "018f0c34-7abc-7def-8123-456789abcdee"), instance);
    expect(foreign.statusCode).toBe(404);
    expect(foreign.body).toBe(missing.body);
  });
});
