import type { AuthenticatedUser } from "../../shared/authenticated-user";
import type { SaveResult, SaveUserSetInput, SavedSetRepository, SavedSetsList } from "./saved-set.types";

export class SavedSetsService {
  public constructor(private readonly repository: SavedSetRepository) {}

  public save(user: AuthenticatedUser, input: SaveUserSetInput): Promise<SaveResult> {
    const now = new Date().toISOString();
    return this.repository.save(user, { destination: input.destination, set: input.set, createdAt: now, updatedAt: now });
  }

  public list(user: AuthenticatedUser): Promise<SavedSetsList> {
    return this.repository.list(user);
  }

  public delete(user: AuthenticatedUser, setID: number): Promise<boolean> {
    return this.repository.delete(user, setID);
  }
}
