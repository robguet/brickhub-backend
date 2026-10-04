import type { ShoppingProductCatalog, ShoppingProductProviderClient, ShoppingProductQuery, ShoppingProductData } from "./shopping-product.types";
import { ShoppingError } from "./shopping.types";
import type { ScrapeDoCredentialsProvider, ShoppingProviderClient, ShoppingCatalog, ShoppingDeadline, ShoppingQuery, ShoppingSearchData } from "./shopping.types";

export class ScrapeDoRepository implements ShoppingCatalog, ShoppingProductCatalog {
  public constructor(
    private readonly credentials: ScrapeDoCredentialsProvider,
    private readonly client: ShoppingProviderClient & Partial<ShoppingProductProviderClient>,
  ) {}
  public async getProduct(query: ShoppingProductQuery, deadline: ShoppingDeadline): Promise<ShoppingProductData> {
    if (!this.client.getProduct) throw new ShoppingError("INTERNAL_ERROR", 500);
    const credentials = await this.credentials.getCredentials(deadline);
    return this.client.getProduct(credentials, query, deadline);
  }
  public async search(query: ShoppingQuery, deadline: ShoppingDeadline): Promise<ShoppingSearchData> {
    const credentials = await this.credentials.getCredentials(deadline);
    return this.client.search(credentials, query, deadline);
  }
}
