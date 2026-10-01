import { describe, expect, it } from "vitest";

import { SavedSetsController } from "../../../../src/modules/saved-sets/saved-sets.controller";
import type { SavedSetRepository } from "../../../../src/modules/saved-sets/saved-set.types";
import { SavedSetsService } from "../../../../src/modules/saved-sets/saved-sets.service";

const body = { destination: "collection", set: { setID: 1, number: "1", numberVariant: 1, name: "Set", year: 2026, theme: "Theme", category: "Normal", released: true, pieces: 1 } };
const lists = { collection: [{ destination: "collection" as const, set: body.set, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }], wishlist: [] };

describe("SavedSetsController", () => {
  it("returns a public 201 envelope without persistence fields", async () => {
    const repository: SavedSetRepository = { save: async (_user, set) => ({ savedSet: set, created: true }), list: async () => lists, delete: async () => false };
    const response = await new SavedSetsController(new SavedSetsService(repository)).save({ sub: "a" }, body);
    expect(response.statusCode).toBe(201);
    expect(response.body).toContain('"created":true');
    expect(response.body).not.toContain('"PK"');
  });

  it("rejects invalid request bodies", async () => {
    const repository: SavedSetRepository = { save: async (_user, set) => ({ savedSet: set, created: true }), list: async () => lists, delete: async () => false };
    const response = await new SavedSetsController(new SavedSetsService(repository)).save({ sub: "a" }, { ...body, userId: "b" });
    expect(response.statusCode).toBe(400);
    expect(response.body).toContain("VALIDATION_ERROR");
  });

  it("explains when the destination is invalid", async () => {
    const repository: SavedSetRepository = { save: async (_user, set) => ({ savedSet: set, created: true }), list: async () => lists, delete: async () => false };
    const response = await new SavedSetsController(new SavedSetsService(repository)).save({ sub: "a" }, { ...body, destination: "holdsad" });
    expect(response.statusCode).toBe(400);
    expect(response.body).toContain("El destino debe ser 'collection' o 'wishlist'.");
  });

  it("returns a public 200 envelope with both saved-set lists", async () => {
    const repository: SavedSetRepository = { save: async (_user, set) => ({ savedSet: set, created: true }), list: async () => lists, delete: async () => false };
    const response = await new SavedSetsController(new SavedSetsService(repository)).list({ sub: "a" });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('"collection"');
    expect(response.body).toContain('"wishlist":[]');
    expect(response.body).toContain('"setID":1');
    expect(response.body).not.toContain('"created"');
    expect(response.body).not.toContain('"PK"');
  });

  it("returns a safe internal error when listing fails", async () => {
    const repository: SavedSetRepository = { save: async (_user, set) => ({ savedSet: set, created: true }), list: async () => { throw new Error("DynamoDB token=secret PK=USER#a"); }, delete: async () => false };
    const response = await new SavedSetsController(new SavedSetsService(repository)).list({ sub: "a" });
    expect(response.statusCode).toBe(500);
    expect(response.body).toContain("INTERNAL_ERROR");
    expect(response.body).not.toContain("token=secret");
    expect(response.body).not.toContain("PK=USER#a");
  });

  it("validates the saved-set identifier before deletion", async () => {
    let calls = 0;
    const repository: SavedSetRepository = { save: async (_user, set) => ({ savedSet: set, created: true }), list: async () => lists, delete: async () => { calls += 1; return true; } };
    const response = await new SavedSetsController(new SavedSetsService(repository)).delete({ sub: "a" }, "0");
    expect(response.statusCode).toBe(400);
    expect(response.body).toContain("VALIDATION_ERROR");
    expect(calls).toBe(0);
  });

  it("returns a public confirmation when deletion succeeds", async () => {
    const repository: SavedSetRepository = { save: async (_user, set) => ({ savedSet: set, created: true }), list: async () => lists, delete: async () => true };
    const response = await new SavedSetsController(new SavedSetsService(repository)).delete({ sub: "a" }, "51931");
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('"setID":51931');
    expect(response.body).toContain('"deleted":true');
  });

  it("returns a safe not-found or internal error for deletion failures", async () => {
    const missing: SavedSetRepository = { save: async (_user, set) => ({ savedSet: set, created: true }), list: async () => lists, delete: async () => false };
    const failed: SavedSetRepository = { save: async (_user, set) => ({ savedSet: set, created: true }), list: async () => lists, delete: async () => { throw new Error("token=secret"); } };
    await expect(new SavedSetsController(new SavedSetsService(missing)).delete({ sub: "a" }, "51931")).resolves.toMatchObject({ statusCode: 404 });
    const response = await new SavedSetsController(new SavedSetsService(failed)).delete({ sub: "a" }, "51931");
    expect(response.statusCode).toBe(500);
    expect(response.body).toContain("INTERNAL_ERROR");
    expect(response.body).not.toContain("token=secret");
  });
});
