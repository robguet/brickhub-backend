import { describe, expect, it } from "vitest";

import { CollectionSetsController } from "../../../../src/modules/collection/collection-sets.controller";
import { CollectionSetsService } from "../../../../src/modules/collection/collection-sets.service";
import type { CollectionSetRepository } from "../../../../src/modules/collection/collection-set.types";

const set = { collectionSetId: "018f0c34-7abc-7def-8123-456789abcdef", catalogSetId: 1, quantity: 1, condition: "used" as const, notes: null, acquiredOn: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
const repository: CollectionSetRepository = {
  list: async (_user, limit, cursor) => { if (cursor === "bad") throw new Error("INVALID_CURSOR"); return { items: [set], page: { limit, nextCursor: null } }; }, create: async (_user, item) => item,
  update: async () => undefined, delete: async () => false,
};
const controller = new CollectionSetsController(new CollectionSetsService(repository));

describe("CollectionSetsController", () => {
  it("returns a safe page and rejects invalid cursors", async () => {
    expect((await controller.list({ sub: "a" }, {})).statusCode).toBe(200);
    expect((await controller.list({ sub: "a" }, { cursor: "bad" })).statusCode).toBe(400);
  });

  it("rejects owner fields and makes missing mutations return 404", async () => {
    expect((await controller.create({ sub: "a" }, { catalogSetId: 1, userId: "b" })).statusCode).toBe(400);
    expect((await controller.update({ sub: "b" }, set.collectionSetId, { quantity: 2 })).statusCode).toBe(404);
    expect((await controller.delete({ sub: "b" }, set.collectionSetId)).statusCode).toBe(404);
  });
});
