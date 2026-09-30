import { describe, expect, it } from "vitest";

import { initializeProfileSchema } from "../../../../src/modules/profile/profile.schemas";

describe("initializeProfileSchema", () => {
  it("accepts the iOS profile input and trims display name", () => {
    expect(initializeProfileSchema.parse({ email: "ada@example.com", displayName: " Ada ", defaultMarket: "MX" })).toEqual({
      email: "ada@example.com", displayName: "Ada", defaultMarket: "MX",
    });
  });

  it("rejects absent, owner-controlled, and unknown fields", () => {
    expect(initializeProfileSchema.safeParse(undefined).success).toBe(false);
    expect(initializeProfileSchema.safeParse({ email: "ada@example.com", displayName: "Ada", defaultMarket: "MX", sub: "forged" }).success).toBe(false);
    expect(initializeProfileSchema.safeParse({ email: "ada@example.com", displayName: "Ada", defaultMarket: "MX", userId: "forged" }).success).toBe(false);
  });
});
