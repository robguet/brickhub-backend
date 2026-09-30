import { randomBytes } from "node:crypto";

import type { AuthenticatedUser } from "../../shared/authenticated-user";
import type { CollectionPage, CollectionSet, CollectionSetRepository, CreateCollectionSetInput, UpdateCollectionSetInput } from "./collection-set.types";

function uuidv7(): string {
  const bytes = randomBytes(16);
  const timestamp = BigInt(Date.now());
  for (let index = 5; index >= 0; index -= 1) bytes[index] = Number((timestamp >> BigInt((5 - index) * 8)) & 0xffn);
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export class CollectionSetsService {
  public constructor(private readonly repository: CollectionSetRepository) {}

  public list(user: AuthenticatedUser, limit: number, cursor?: string): Promise<CollectionPage> {
    return this.repository.list(user, limit, cursor);
  }

  public async create(user: AuthenticatedUser, input: CreateCollectionSetInput): Promise<CollectionSet> {
    const now = new Date().toISOString();
    return this.repository.create(user, { ...input, collectionSetId: uuidv7(), createdAt: now, updatedAt: now });
  }

  public update(user: AuthenticatedUser, id: string, input: UpdateCollectionSetInput): Promise<CollectionSet | undefined> {
    return this.repository.update(user, id, input);
  }

  public delete(user: AuthenticatedUser, id: string): Promise<boolean> {
    return this.repository.delete(user, id);
  }
}
