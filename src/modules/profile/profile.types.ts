import type { AuthenticatedUser } from "../../shared/authenticated-user";

export const profileMarkets = ["MX", "US", "ES"] as const;
export type ProfileMarket = (typeof profileMarkets)[number];

export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  defaultMarket: ProfileMarket;
  authProviders: string[];
  createdAt: string;
  updatedAt: string;
}

export interface InitializeProfileInput {
  email: string;
  displayName: string;
  defaultMarket: ProfileMarket;
}

export interface ProfileRepository {
  get(user: AuthenticatedUser): Promise<UserProfile | undefined>;
  createIfAbsent(user: AuthenticatedUser, profile: UserProfile): Promise<boolean>;
}
