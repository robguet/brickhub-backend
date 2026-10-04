import type { ShoppingProductCatalog, ShoppingProductQuery, ShoppingProductData } from "./shopping-product.types";
import type { ShoppingDeadline } from "./shopping.types";
export class GetShoppingProductService {
 public constructor(private readonly catalog: ShoppingProductCatalog) {}
 public getProduct(query: ShoppingProductQuery, deadline: ShoppingDeadline): Promise<ShoppingProductData> { return this.catalog.getProduct(query,deadline); }
}
