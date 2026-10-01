import { describe, expect, it } from "vitest";

import { SavedSetsService } from "../../../../src/modules/saved-sets/saved-sets.service";
import type { SavedSet, SavedSetRepository, SavedSetsList } from "../../../../src/modules/saved-sets/saved-set.types";

const input = { destination: "collection" as const, set: { setID: 1, number: "1", numberVariant: 1, name: "Set", year: 2026, theme: "Theme", category: "Normal", released: true, pieces: 1 } };

describe("SavedSetsService", () => {
  it("persists the supplied snapshot under the authenticated user with generated UTC timestamps", async () => {
    let captured: SavedSet | undefined;
    const repository: SavedSetRepository = { save: async (_user, savedSet) => { captured = savedSet; return { savedSet, created: true }; }, list: async () => ({ collection: [], wishlist: [] }), delete: async () => false };
    const result = await new SavedSetsService(repository).save({ sub: "trusted" }, input);
    expect(captured).toMatchObject({ destination: "collection", set: input.set });
    expect(captured?.createdAt).toMatch(/Z$/);
    expect(captured?.updatedAt).toBe(captured?.createdAt);
    expect(result.created).toBe(true);
  });

  it("delegates listing to the repository using only the authenticated user", async () => {
    const expected: SavedSetsList = { collection: [], wishlist: [{ destination: "wishlist", set: input.set, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }] };
    let receivedSub: string | undefined;
    const repository: SavedSetRepository = {
      save: async (_user, savedSet) => ({ savedSet, created: true }),
      list: async (user) => { receivedSub = user.sub; return expected; },
      delete: async () => false,
    };
    await expect(new SavedSetsService(repository).list({ sub: "trusted" })).resolves.toEqual(expected);
    expect(receivedSub).toBe("trusted");
  });

  it("delegates deletion to the repository using only the authenticated user and set ID", async () => {
    let received: { sub: string; setID: number } | undefined;
    const repository: SavedSetRepository = {
      save: async (_user, savedSet) => ({ savedSet, created: true }),
      list: async () => ({ collection: [], wishlist: [] }),
      delete: async (user, setID) => { received = { sub: user.sub, setID }; return true; },
    };

    await expect(new SavedSetsService(repository).delete({ sub: "trusted" }, 51931)).resolves.toBe(true);
    expect(received).toEqual({ sub: "trusted", setID: 51931 });
  });
});
