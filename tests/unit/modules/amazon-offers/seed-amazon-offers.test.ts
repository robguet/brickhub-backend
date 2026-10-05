import { expect, it } from "vitest";
import { initialOffers } from "../../../../src/modules/amazon-offers/seed-amazon-offers";
it("defines the five initial cards in editorial order", () => { expect(initialOffers).toHaveLength(5); expect(initialOffers.map(offer => offer.position)).toEqual([1, 2, 3, 4, 5]); expect(initialOffers[0]?.title).toBe("LEGO Señor de los Anillos"); });
