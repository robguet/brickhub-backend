import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("GET /v1/sets contract", () => {
  it("documenta parámetros, resultados y errores públicos", () => {
    const contract = readFileSync(
      resolve(process.cwd(), "specs/001-search-brickset-sets/contracts/openapi.yaml"),
      "utf8",
    );

    expect(contract).toContain("/v1/sets:");
    expect(contract).toContain("name: query");
    expect(contract).toContain("minimum: 1");
    expect(contract).toContain("maximum: 500");
    expect(contract).toContain("SetSearchResult");
    expect(contract).toContain("ErrorResponse");
  });
});
