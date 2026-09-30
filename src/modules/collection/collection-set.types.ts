import type { AuthenticatedUser } from "../../shared/authenticated-user";

export const collectionConditions = ["sealed", "new", "used", "incomplete"] as const;
export type CollectionCondition = (typeof collectionConditions)[number];

export interface CollectionSet {
  collectionSetId: string;
  catalogSetId: number;
  quantity: number;
  condition: CollectionCondition;
  notes: string | null;
  acquiredOn: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCollectionSetInput {
  catalogSetId: number;
  quantity: number;
  condition: CollectionCondition;
  notes: string | null;
  acquiredOn: string | null;
}

export interface UpdateCollectionSetInput {
  quantity?: number;
  condition?: CollectionCondition;
  notes?: string | null;
  acquiredOn?: string | null;
}

export interface CollectionPage {
  items: CollectionSet[];
  page: { limit: number; nextCursor: string | null };
}

export interface CollectionSetRepository {
  list(user: AuthenticatedUser, limit: number, cursor?: string): Promise<CollectionPage>;
  create(user: AuthenticatedUser, set: CollectionSet): Promise<CollectionSet>;
  update(user: AuthenticatedUser, collectionSetId: string, input: UpdateCollectionSetInput): Promise<CollectionSet | undefined>;
  delete(user: AuthenticatedUser, collectionSetId: string): Promise<boolean>;
}
