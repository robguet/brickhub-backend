import { describe, expect, it } from "vitest";

import { GetSetsController } from "../../../src/modules/sets/get-sets.controller";
import { getSetsRoute } from "../../../src/modules/sets/get-sets.route";
import { SearchSetsService } from "../../../src/modules/sets/search-sets.service";
import type { BricksetCatalog } from "../../../src/modules/sets/set.types";

describe("get sets route", () => {
  it("devuelve una respuesta compatible con HTTP API v2 usando un proveedor falso", async () => {
    const catalog: BricksetCatalog = {
      search: async () => ({ status: "success", matches: 1, sets: [{ number: "10212" }] }),
    };
    const controller = new GetSetsController(new SearchSetsService(catalog));

    const response = await getSetsRoute(
      { queryStringParameters: { query: "10212" }, requestContext: { requestId: "request-1" } } as never,
      { controller },
    );

    expect(response).toMatchObject({ statusCode: 200 });
    expect(JSON.parse(response.body ?? "{}")).toEqual({
      status: "success",
      matches: 1,
      sets: [{ number: "10212" }],
    });
  });
});
