import { describe, expect, it } from "vitest";

import { CollectionSetsService } from "../../../../src/modules/collection/collection-sets.service";
import type { CollectionSetRepository } from "../../../../src/modules/collection/collection-set.types";

describe("CollectionSetsService", () => {
  it("creates records without caller-controlled owner", async () => {
    let saved: unknown;
    const repository: CollectionSetRepository = {
      list: async () => ({ items: [], page: { limit: 20, nextCursor: null } }),
      create: async (_user, set) => { saved = set; return set; },
      update: async () => undefined,
      delete: async () => false,
    };
    await new CollectionSetsService(repository).create({ sub: "trusted" }, { catalogSetId: 1, quantity: 1, condition: "used", notes: null, acquiredOn: null });
    expect(saved).toMatchObject({ catalogSetId: 1 });
    expect(saved).not.toHaveProperty("sub");
  });

  it("delegates list, update and delete using the authenticated sub", async () => {
    const calls: string[] = [];
    const set = { collectionSetId: "018f0c34-7abc-7def-8123-456789abcdef", catalogSetId: 1, quantity: 1, condition: "used" as const, notes: null, acquiredOn: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
    const repository: CollectionSetRepository = {
      list: async (user, limit, cursor) => { calls.push(`${user.sub}:${limit}:${cursor}`); return { items: [set], page: { limit, nextCursor: null } }; },
      create: async (_user, item) => item,
      update: async (user, id, input) => { calls.push(`${user.sub}:${id}:${input.quantity}`); return { ...set, ...input }; },
      delete: async (user, id) => { calls.push(`${user.sub}:${id}`); return true; },
    };
    const service = new CollectionSetsService(repository);
    expect((await service.list({ sub: "a" }, 20, "cursor")).items).toEqual([set]);
    expect(await service.update({ sub: "a" }, set.collectionSetId, { quantity: 2 })).toMatchObject({ quantity: 2 });
    expect(await service.delete({ sub: "a" }, set.collectionSetId)).toBe(true);
    expect(calls).toEqual([`a:20:cursor`, `a:${set.collectionSetId}:2`, `a:${set.collectionSetId}`]);
  });
});
