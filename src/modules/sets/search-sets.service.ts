import type { BricksetCatalog, SetSearchQuery, SetSearchResult } from "./set.types";

export class SearchSetsService {
  public constructor(private readonly catalog: BricksetCatalog) {}

  public search(query: SetSearchQuery): Promise<SetSearchResult> {
    return this.catalog.search(query);
  }
}
