import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
it("documents the protected Amazon offers route without internal fields", () => { const contract = readFileSync("specs/010-amazon-offer-cards/contracts/openapi.yaml", "utf8"); expect(contract).toContain("/v1/amazon-offers:"); expect(contract).toContain("CognitoAccessToken"); expect(contract).toContain("'401':"); expect(contract).toContain("required: [title, discount, url, image]"); expect(contract).not.toContain("amazonOfferId:"); });
