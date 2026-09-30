import { describe, expect, it } from "vitest";

import { SavedSetsController } from "../../../../src/modules/saved-sets/saved-sets.controller";
import type { SavedSetRepository } from "../../../../src/modules/saved-sets/saved-set.types";
import { SavedSetsService } from "../../../../src/modules/saved-sets/saved-sets.service";

const body = { destination: "collection", set: { setID: 1, number: "1", numberVariant: 1, name: "Set", year: 2026, theme: "Theme", category: "Normal", released: true, pieces: 1 } };

describe("SavedSetsController", () => {
  it("returns a public 201 envelope without persistence fields", async () => {
    const repository: SavedSetRepository = { save: async (_user, set) => ({ savedSet: set, created: true }) };
    const response = await new SavedSetsController(new SavedSetsService(repository)).save({ sub: "a" }, body);
    expect(response.statusCode).toBe(201);
    expect(response.body).toContain('"created":true');
    expect(response.body).not.toContain('"PK"');
  });

  it("rejects invalid request bodies", async () => {
    const repository: SavedSetRepository = { save: async (_user, set) => ({ savedSet: set, created: true }) };
    const response = await new SavedSetsController(new SavedSetsService(repository)).save({ sub: "a" }, { ...body, userId: "b" });
    expect(response.statusCode).toBe(400);
    expect(response.body).toContain("VALIDATION_ERROR");
  });

  it("explains when the destination is invalid", async () => {
    const repository: SavedSetRepository = { save: async (_user, set) => ({ savedSet: set, created: true }) };
    const response = await new SavedSetsController(new SavedSetsService(repository)).save({ sub: "a" }, { ...body, destination: "holdsad" });
    expect(response.statusCode).toBe(400);
    expect(response.body).toContain("El destino debe ser 'collection' o 'wishlist'.");
  });
});
