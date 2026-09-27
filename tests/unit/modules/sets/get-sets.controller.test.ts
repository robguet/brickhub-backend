import { describe, expect, it } from "vitest";

import { GetSetsController } from "../../../../src/modules/sets/get-sets.controller";
import { SearchSetsService } from "../../../../src/modules/sets/search-sets.service";
import { SearchError, type BricksetCatalog } from "../../../../src/modules/sets/set.types";

function createController(catalog: BricksetCatalog): GetSetsController {
  return new GetSetsController(new SearchSetsService(catalog));
}

describe("GetSetsController", () => {
  it("normaliza parámetros y responde con resultados", async () => {
    const controller = createController({
      search: async (query) => ({ status: "success", matches: query.pageSize, sets: [] }),
    });

    const response = await controller.handle({ query: " 10212 ", pageSize: "2" });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body ?? "{}")).toEqual({ status: "success", matches: 2, sets: [] });
  });

  it.each([
    [{}, "VALIDATION_ERROR", 400],
    [{ query: "10212", pageSize: "501" }, "VALIDATION_ERROR", 400],
  ])("rechaza parámetros inválidos", async (query, code, statusCode) => {
    const response = await createController({ search: async () => ({ status: "success", matches: 0, sets: [] }) }).handle(query);

    expect(response.statusCode).toBe(statusCode);
    expect(JSON.parse(response.body ?? "{}")).toMatchObject({ status: "error", code });
  });

  it.each([
    [new SearchError("UPSTREAM_RATE_LIMITED", 429, "El catálogo está temporalmente limitado. Intenta más tarde."), 429, "UPSTREAM_RATE_LIMITED"],
    [new SearchError("UPSTREAM_INVALID_RESPONSE", 502, "El catálogo devolvió una respuesta inválida."), 502, "UPSTREAM_INVALID_RESPONSE"],
  ])("traduce errores seguros", async (error, statusCode, code) => {
    const response = await createController({ search: async () => Promise.reject(error) }).handle({ query: "10212" });

    expect(response.statusCode).toBe(statusCode);
    expect(JSON.parse(response.body ?? "{}")).toMatchObject({ status: "error", code });
  });
});
