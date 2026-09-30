import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("collection routes contract", () => {
  it("documents protected CRUD without a user path", () => {
    const contract = readFileSync(resolve(process.cwd(), "specs/002-user-lego-collection/contracts/openapi.yaml"), "utf8");
    expect(contract).toContain("/v1/collection/sets:");
    expect(contract).toContain("lego-collection/sets.read");
    expect(contract).toContain("lego-collection/sets.write");
    expect(contract).not.toContain("/users/{sub}");
  });

  it("defines strict create/update bodies, pagination and safe deletion", () => {
    const contract = readFileSync(resolve(process.cwd(), "specs/002-user-lego-collection/contracts/openapi.yaml"), "utf8");
    expect(contract).toContain("additionalProperties: false");
    expect(contract).toContain("minimum: 1, maximum: 100");
    expect(contract).toContain("minProperties: 1");
    expect(contract).toContain("DeleteCollectionSetResponse");
    expect(contract).toContain("RESOURCE_NOT_FOUND");
  });
});
