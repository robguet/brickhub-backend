import { BricksetClient } from "./brickset.client";
import type { BricksetCredentialsProvider } from "./brickset-secret.provider";
import type { BricksetCatalog, SetSearchQuery, SetSearchResult } from "./set.types";

export class BricksetRepository implements BricksetCatalog {
  public constructor(
    private readonly credentialsProvider: BricksetCredentialsProvider,
    private readonly client: BricksetClient,
  ) {}

  public async search(query: SetSearchQuery): Promise<SetSearchResult> {
    const credentials = await this.credentialsProvider.getCredentials();
    return this.client.getSets(credentials, query);
  }
}
