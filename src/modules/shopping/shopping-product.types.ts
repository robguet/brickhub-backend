import type { ShoppingQuery, ShoppingDeadline, ShoppingCredentials } from "./shopping.types";
export interface ShoppingProductQuery extends ShoppingQuery { catalog_id: string }
export interface ShoppingStore {
 position: number; name: string;
 link?: string | null; title?: string | null; tag?: string | null; merchant_id?: string | null;
 logo?: string | null; thumbnail?: string | null; rating?: number | null; reviews?: number | null;
 price?: string | null; extracted_price?: number | null; currency?: string | null;
 shipping?: string | null; shipping_extracted?: number | null; tax_hint?: string | null;
 total?: string | null; extracted_total?: number | null; details_and_offers?: string[] | null;
}
export interface ShoppingProductData {
 product_results: { title: string; stores: ShoppingStore[]; product_id?: string | null;
 more_options?: { title: string; product_id: string }[] | null;
 extension_ids?: { catalog_id?: string | null } | null; source?: string | null };
 search_parameters?: { catalog_id?: string | null; product_id?: string | null; engine?: string | null;
 q?: string | null; hl?: string | null; gl?: string | null; google_domain?: string | null;
 location?: string | null; device?: string | null; load_all_stores?: boolean | null; more_stores?: boolean | null } | null;
}
export interface ShoppingProductCatalog { getProduct(query: ShoppingProductQuery, deadline: ShoppingDeadline): Promise<ShoppingProductData> }
export interface ShoppingProductProviderClient { getProduct(credentials: ShoppingCredentials, query: ShoppingProductQuery, deadline: ShoppingDeadline): Promise<ShoppingProductData> }
