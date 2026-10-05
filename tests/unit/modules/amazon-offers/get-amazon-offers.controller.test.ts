import { describe, expect, it } from "vitest";
import { GetAmazonOffersController } from "../../../../src/modules/amazon-offers/get-amazon-offers.controller";
import { GetAmazonOffersService } from "../../../../src/modules/amazon-offers/get-amazon-offers.service";
describe("GetAmazonOffersController", () => {
  it("returns the documented public envelope", async () => { const response = await new GetAmazonOffersController(new GetAmazonOffersService({ list: async () => [{ title: "Lego", discount: "20%", url: "https://amazon.com/x", image: "/images/x.png" }] })).handle(); expect(JSON.parse(response.body ?? "")).toEqual({ status: "success", data: { offers: [{ title: "Lego", discount: "20%", url: "https://amazon.com/x", image: "/images/x.png" }] } }); });
  it("does not expose a repository failure", async () => { const response = await new GetAmazonOffersController(new GetAmazonOffersService({ list: async () => { throw new Error("table private-name"); } })).handle(); expect(response.statusCode).toBe(500); expect(response.body).not.toContain("private-name"); });
});
