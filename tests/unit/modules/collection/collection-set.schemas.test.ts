import { describe, expect, it } from "vitest";

import { createCollectionSetSchema, updateCollectionSetSchema } from "../../../../src/modules/collection/collection-set.schemas";

describe("collection schemas", () => {
  it("defaults create values and rejects client ownership", () => {
    expect(createCollectionSetSchema.parse({ catalogSetId: 1 })).toMatchObject({ quantity: 1, condition: "used" });
    expect(createCollectionSetSchema.safeParse({ catalogSetId: 1, userId: "forged" }).success).toBe(false);
  });

  it("requires a non-empty update", () => {
    expect(updateCollectionSetSchema.safeParse({}).success).toBe(false);
    expect(updateCollectionSetSchema.parse({ notes: null })).toEqual({ notes: null });
  });
});
