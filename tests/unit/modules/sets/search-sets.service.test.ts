import { describe, expect, it } from "vitest";

import { SearchSetsService } from "../../../../src/modules/sets/search-sets.service";
import type { BricksetCatalog, SetSearchResult } from "../../../../src/modules/sets/set.types";

describe("SearchSetsService", () => {
  it("preserva una búsqueda exitosa con campos opcionales ausentes", async () => {
    const expected: SetSearchResult = {
      status: "success",
      matches: 1,
      sets: [{ setID: 1, number: "10212", name: "Imperial Shuttle" }],
    };
    const catalog: BricksetCatalog = { search: async () => expected };
    const service = new SearchSetsService(catalog);

    await expect(service.search({ query: "10212", pageNumber: 1, pageSize: 20 })).resolves.toEqual(expected);
  });

  it("preserva cero coincidencias como respuesta exitosa", async () => {
    const catalog: BricksetCatalog = {
      search: async () => ({ status: "success", matches: 0, sets: [] }),
    };

    await expect(new SearchSetsService(catalog).search({ query: "missing", pageNumber: 1, pageSize: 20 })).resolves.toEqual({
      status: "success",
      matches: 0,
      sets: [],
    });
  });
});
