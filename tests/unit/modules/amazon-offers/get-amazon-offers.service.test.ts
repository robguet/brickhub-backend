import { expect, it } from "vitest";
import { GetAmazonOffersService } from "../../../../src/modules/amazon-offers/get-amazon-offers.service";
it("preserves an empty catalog as a successful domain result", async () => { await expect(new GetAmazonOffersService({ list: async () => [] }).list()).resolves.toEqual([]); });
