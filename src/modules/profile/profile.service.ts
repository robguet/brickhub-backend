import { randomBytes } from "node:crypto";

import type { AuthenticatedUser } from "../../shared/authenticated-user";
import type { InitializeProfileInput, ProfileRepository, UserProfile } from "./profile.types";

function uuidv7(): string {
  const bytes = randomBytes(16);
  const timestamp = BigInt(Date.now());
  for (let index = 5; index >= 0; index -= 1) bytes[index] = Number((timestamp >> BigInt((5 - index) * 8)) & 0xffn);
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export class ProfileService {
  public constructor(private readonly repository: ProfileRepository) {}

  public get(user: AuthenticatedUser): Promise<UserProfile | undefined> {
    return this.repository.get(user);
  }

  public async initialize(user: AuthenticatedUser, input: InitializeProfileInput): Promise<{ profile: UserProfile; created: boolean }> {
    const existing = await this.repository.get(user);
    if (existing !== undefined) return { profile: existing, created: false };

    const now = new Date().toISOString();
    const candidate: UserProfile = {
      userId: uuidv7(), email: input.email, displayName: input.displayName, defaultMarket: input.defaultMarket,
      authProviders: ["cognito"], createdAt: now, updatedAt: now,
    };
    if (await this.repository.createIfAbsent(user, candidate)) return { profile: candidate, created: true };

    const winner = await this.repository.get(user);
    if (winner !== undefined) return { profile: winner, created: false };
    throw new Error("PROFILE_CREATE_RACE_FAILED");
  }
}
