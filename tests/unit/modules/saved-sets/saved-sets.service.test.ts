import { describe, expect, it } from "vitest";

import { SavedSetsService } from "../../../../src/modules/saved-sets/saved-sets.service";
import type { SavedSet, SavedSetRepository } from "../../../../src/modules/saved-sets/saved-set.types";

const input = { destination: "collection" as const, set: { setID: 1, number: "1", numberVariant: 1, name: "Set", year: 2026, theme: "Theme", category: "Normal", released: true, pieces: 1 } };

describe("SavedSetsService", () => {
  it("persists the supplied snapshot under the authenticated user with generated UTC timestamps", async () => {
    let captured: SavedSet | undefined;
    const repository: SavedSetRepository = { save: async (_user, savedSet) => { captured = savedSet; return { savedSet, created: true }; } };
    const result = await new SavedSetsService(repository).save({ sub: "trusted" }, input);
    expect(captured).toMatchObject({ destination: "collection", set: input.set });
    expect(captured?.createdAt).toMatch(/Z$/);
    expect(captured?.updatedAt).toBe(captured?.createdAt);
    expect(result.created).toBe(true);
  });
});
