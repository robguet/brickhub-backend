import { describe, expect, it } from "vitest";

import { saveUserSetSchema } from "../../../../src/modules/saved-sets/saved-set.schemas";

const valid = {
  destination: "collection",
  set: {
    setID: 51931, number: "30728", numberVariant: 1, name: "The Razor Crest", year: 2026,
    theme: "Star Wars", category: "Normal", released: true, pieces: 74,
    launchDate: "2026-04-26T00:00:00Z", image: { thumbnailURL: "https://images.brickset.com/s.jpg", imageURL: "https://images.brickset.com/l.jpg" },
    barcode: { EAN: "5702018058121" },
    LEGOCom: { US: { retailPrice: 259.99, dateFirstAvailable: "2010-09-02T00:00:00Z", dateLastAvailable: "2012-12-20T00:00:00Z" } },
  },
};

describe("save user set schema", () => {
  it("accepts both destinations and valid optional metadata", () => {
    expect(saveUserSetSchema.safeParse(valid).success).toBe(true);
    expect(saveUserSetSchema.safeParse({ ...valid, destination: "wishlist" }).success).toBe(true);
  });

  it("rejects invalid boundaries, URLs, timestamps, EAN and unknown fields", () => {
    expect(saveUserSetSchema.safeParse({ ...valid, destination: "both" }).success).toBe(false);
    expect(saveUserSetSchema.safeParse({ ...valid, userId: "other" }).success).toBe(false);
    expect(saveUserSetSchema.safeParse({ ...valid, set: { ...valid.set, setID: 0 } }).success).toBe(false);
    expect(saveUserSetSchema.safeParse({ ...valid, set: { ...valid.set, year: 1948 } }).success).toBe(false);
    expect(saveUserSetSchema.safeParse({ ...valid, set: { ...valid.set, launchDate: "2026-04-26" } }).success).toBe(false);
    expect(saveUserSetSchema.safeParse({ ...valid, set: { ...valid.set, image: { thumbnailURL: "http://image", imageURL: "https://image" } } }).success).toBe(false);
    expect(saveUserSetSchema.safeParse({ ...valid, set: { ...valid.set, barcode: { EAN: "123" } } }).success).toBe(false);
    expect(saveUserSetSchema.safeParse({ ...valid, set: { ...valid.set, LEGOCom: { USA: { retailPrice: 259.99 } } } }).success).toBe(false);
    expect(saveUserSetSchema.safeParse({ ...valid, set: { ...valid.set, LEGOCom: { US: { retailPrice: -1 } } } }).success).toBe(false);
    expect(saveUserSetSchema.safeParse({ ...valid, set: { ...valid.set, unexpected: true } }).success).toBe(false);
  });
});
