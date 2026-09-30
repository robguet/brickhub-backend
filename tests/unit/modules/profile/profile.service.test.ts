import { describe, expect, it } from "vitest";

import { ProfileService } from "../../../../src/modules/profile/profile.service";
import type { ProfileRepository, UserProfile } from "../../../../src/modules/profile/profile.types";

function repository(): ProfileRepository & { items: Map<string, UserProfile> } {
  const items = new Map<string, UserProfile>();
  return {
    items,
    get: async (user) => items.get(user.sub),
    createIfAbsent: async (user, profile) => {
      if (items.has(user.sub)) return false;
      items.set(user.sub, profile);
      return true;
    },
  };
}

describe("ProfileService", () => {
  it("initializes once for the authenticated sub and preserves the profile", async () => {
    const store = repository();
    const service = new ProfileService(store);
    const first = await service.initialize({ sub: "user-a" }, { email: "ada@example.com", displayName: "Ada", defaultMarket: "MX" });
    const second = await service.initialize({ sub: "user-a" }, { email: "changed@example.com", displayName: "Other", defaultMarket: "US" });
    expect(first.created).toBe(true);
    expect(first.profile.userId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7/);
    expect(first.profile.createdAt).toBe(first.profile.updatedAt);
    expect(first.profile).not.toHaveProperty("sub");
    expect(second).toEqual({ profile: first.profile, created: false });
  });

  it("keeps profiles isolated by authenticated sub", async () => {
    const service = new ProfileService(repository());
    const a = await service.initialize({ sub: "user-a" }, { email: "a@example.com", displayName: "A", defaultMarket: "MX" });
    const b = await service.initialize({ sub: "user-b" }, { email: "b@example.com", displayName: "B", defaultMarket: "US" });
    expect(a.profile.userId).not.toBe(b.profile.userId);
    expect((await service.get({ sub: "user-b" }))?.email).toBe("b@example.com");
  });

  it("returns the persisted winner after a conditional-create race", async () => {
    const winner: UserProfile = { userId: "018f0c34-7abc-7def-8123-456789abcdef", email: "winner@example.com", displayName: "Winner", defaultMarket: "ES", authProviders: ["cognito"], createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
    let reads = 0;
    const repository: ProfileRepository = {
      get: async () => { reads += 1; return reads === 1 ? undefined : winner; },
      createIfAbsent: async () => false,
    };
    const result = await new ProfileService(repository).initialize({ sub: "user-a" }, { email: "ada@example.com", displayName: "Ada", defaultMarket: "MX" });
    expect(result).toEqual({ profile: winner, created: false });
  });
});
