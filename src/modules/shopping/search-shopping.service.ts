import type { ShoppingCatalog, ShoppingDeadline, ShoppingQuery, ShoppingSearchData } from "./shopping.types";

export class SearchShoppingService {
  public constructor(private readonly catalog: ShoppingCatalog) {}
  public search(query: ShoppingQuery, deadline: ShoppingDeadline): Promise<ShoppingSearchData> {
    return this.catalog.search(query, deadline);
  }
}
