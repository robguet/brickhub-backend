import { readFileSync } from "node:fs";
import type { ShoppingProductData, ShoppingProductQuery } from "../../../src/modules/shopping/shopping-product.types";
import { query, shoppingEvent } from "./helpers";
export { deadline } from "./helpers";
export const productQuery: ShoppingProductQuery = {...query,catalog_id:"6789801949246787910"};
export const productSample = (): ShoppingProductData => JSON.parse(readFileSync("tests/fixtures/shopping/mexico-shopping-product.json","utf8")) as ShoppingProductData;
export function productEvent(rawQuery = "catalog_id=6789801949246787910&q=LEGO+75394", authenticated = true) {
 const event = shoppingEvent(rawQuery,authenticated); event.requestContext.http.path="/v1/shopping/product"; return event;
}
