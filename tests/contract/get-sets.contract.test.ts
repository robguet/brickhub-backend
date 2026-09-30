import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("GET /v1/sets contract", () => {
  it("documenta autenticación Bearer, parámetros, resultados y errores públicos", () => {
    const contract = readFileSync(
      resolve(process.cwd(), "specs/001-search-brickset-sets/contracts/openapi.yaml"),
      "utf8",
    );

    expect(contract).toContain("/v1/sets:");
    expect(contract).toContain("security: [{ CognitoAccessToken: [] }]");
    expect(contract).toContain("CognitoAccessToken:");
    expect(contract).toContain("scheme: bearer");
    expect(contract).toContain("bearerFormat: JWT");
    expect(contract).toContain("name: query");
    expect(contract).toContain("minimum: 1");
    expect(contract).toContain("maximum: 500");
    expect(contract).toContain("SetSearchResult");
    expect(contract).toContain("ErrorResponse");
    expect(contract).toContain("'401':");
    expect(contract).not.toContain("lego-collection/");
    expect(contract).not.toContain("authorizationHeader");
    expect(contract).not.toContain("accessToken:");
    expect(contract).not.toContain("BRICKSET_API_KEY");
  });
});
