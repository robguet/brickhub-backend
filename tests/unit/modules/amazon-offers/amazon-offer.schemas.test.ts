import { describe, expect, it } from "vitest";
import { parseAmazonOfferCard, toPublicAmazonOffer } from "../../../../src/modules/amazon-offers/amazon-offer.schemas";
import { card } from "../../../fixtures/amazon-offers/amazon-offer-cards";
describe("Amazon offer storage boundary", () => {
  it("validates a visible card and removes internal fields", () => { const parsed = parseAmazonOfferCard(card(1, "one")); expect(toPublicAmazonOffer(parsed)).toEqual({ title: "Oferta 1", discount: "hasta 20%", url: "https://www.amazon.com.mx/list/one", image: "/images/one.png" }); });
  it.each([card(0, "zero"), card(1, "bad-url", { url: "http://amazon.com" }), card(1, "bad-image", { image: "images/nope.png" }), card(1, "hidden", { SK: "HIDDEN#000001#hidden" })])("rejects invalid card", value => expect(() => parseAmazonOfferCard(value)).toThrow());
});
