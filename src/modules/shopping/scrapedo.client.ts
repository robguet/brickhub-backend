import { shoppingProductResultSchema } from "./shopping-product.schemas";
import type { ShoppingProductProviderClient, ShoppingProductQuery, ShoppingProductData } from "./shopping-product.types";
import { readPayload, safeProductUrl, reflectsSecret, hasProviderError } from "./scrapedo-transport";
import { ShoppingError, type ShoppingCredentials, type ShoppingDeadline, type ShoppingProviderClient, type ShoppingProduct, type ShoppingQuery, type ShoppingSearchData } from "./shopping.types";
import { shoppingResultSchema } from "./shopping.schemas";
import { boundedOperation } from "./shopping-deadline";
import { parseRetryAfter } from "./shopping-response";

const SHOPPING_URL = "https://api.scrape.do/plugin/google/shopping";
const continuationParameters = new Set(["q", "hl", "gl", "google_domain", "location", "device", "sort_by", "start", "uule", "shoprs"]);

function sanitizeProduct(product: ShoppingProduct): void {
  for (const key of ["product_link", "thumbnail", "source_icon"] as const) {
    const value = product[key];
    if (typeof value === "string" && !value.startsWith("data:")) product[key] = safeProductUrl(value);
  }
}
function safeContinuation(value: string): string | undefined {
  try {
    const url = new URL(value, SHOPPING_URL);
    if (url.origin !== "https://api.scrape.do" || url.pathname !== "/plugin/google/shopping" || url.username || url.password) return undefined;
    const safe = new URLSearchParams();
    for (const [key, content] of url.searchParams) if (continuationParameters.has(key)) safe.append(key, content);
    return url.pathname + (safe.size ? "?" + safe.toString() : "");
  } catch { return undefined; }
}
function sanitizeData(data: ShoppingSearchData, apiKey: string): ShoppingSearchData {
  data.shopping_results.forEach(sanitizeProduct);
  data.categorized_shopping_results?.forEach(category => category.shopping_results.forEach(sanitizeProduct));
  if (data.pagination) {
    for (const key of ["next", "previous"] as const) {
      const value = data.pagination[key];
      if (typeof value === "string") {
        const safe = safeContinuation(value);
        if (safe === undefined) delete data.pagination[key];
        else data.pagination[key] = safe;
      }
    }
  }
  if (reflectsSecret(data, apiKey)) throw new ShoppingError("UPSTREAM_INVALID_RESPONSE", 502);
  return data;
}
export class ScrapeDoClient implements ShoppingProviderClient, ShoppingProductProviderClient {
  public constructor(private readonly fetchImplementation: typeof fetch = fetch) {}
  public async getProduct(credentials: ShoppingCredentials, query: ShoppingProductQuery, deadline: ShoppingDeadline): Promise<ShoppingProductData> {
    const url = new URL(SHOPPING_URL + "/product");
    for (const key of ["catalog_id", "q", "hl", "gl", "google_domain", "location"] as const) url.searchParams.set(key, query[key]);
    url.searchParams.set("token", credentials.apiKey);
    url.searchParams.set("load_all_stores", "true");
    url.searchParams.set("more_stores", "true");
    try {
      return await boundedOperation(deadline.signal, Math.min(24_000, deadline.expiresAt - Date.now()), async signal => {
        const response = await this.fetchImplementation(url, { signal, redirect: "error" });
        if (signal.aborted || !response.ok) {
          void response.body?.cancel().catch(() => undefined);
          if (!signal.aborted && response.status === 429) throw new ShoppingError("UPSTREAM_RATE_LIMITED", 429, parseRetryAfter(response.headers.get("Retry-After")));
          throw new ShoppingError("UPSTREAM_UNAVAILABLE", 502);
        }
        const payload = await readPayload(response, signal);
        if (hasProviderError(payload) || response.headers.get("Scrape.do-Auto-Page-Truncated")?.trim().toLowerCase() === "true") throw new ShoppingError("UPSTREAM_INVALID_RESPONSE", 502);
        if (payload !== null && typeof payload === "object" && "product_results" in payload) {
          const product = payload.product_results;
          if (product !== null && typeof product === "object" && "next_page_token" in product) {
            const cursor: unknown = product.next_page_token;
            if (cursor !== null && cursor !== undefined && cursor !== "") throw new ShoppingError("UPSTREAM_INVALID_RESPONSE", 502);
          }
        }
        const parsed = shoppingProductResultSchema.safeParse(payload);
        if (!parsed.success) throw new ShoppingError("UPSTREAM_INVALID_RESPONSE", 502);
        for (const store of parsed.data.product_results.stores) {
          for (const key of ["link", "logo", "thumbnail"] as const) {
            const value = store[key];
            if (typeof value === "string" && !value.startsWith("data:")) store[key] = safeProductUrl(value);
            if (typeof value === "string" && value.startsWith("data:") && Buffer.from(value.slice(value.indexOf(",") + 1), "base64").toString("utf8").includes(credentials.apiKey)) throw new ShoppingError("UPSTREAM_INVALID_RESPONSE", 502);
          }
        }
        if (reflectsSecret(parsed.data, credentials.apiKey)) throw new ShoppingError("UPSTREAM_INVALID_RESPONSE", 502);
        return parsed.data;
      }, new ShoppingError("UPSTREAM_UNAVAILABLE", 502));
    } catch (error: unknown) {
      if (error instanceof ShoppingError) throw error;
      throw new ShoppingError("UPSTREAM_UNAVAILABLE", 502);
    }
  }
  public async search(credentials: ShoppingCredentials, query: ShoppingQuery, deadline: ShoppingDeadline): Promise<ShoppingSearchData> {
    const url = new URL(SHOPPING_URL);
    // Copy only the validated public parameters, never additional properties from an adapter.
    for (const key of ["q", "hl", "gl", "google_domain", "location"] as const) url.searchParams.set(key, query[key]);
    url.searchParams.set("token", credentials.apiKey);
    url.searchParams.set("device", "desktop");
    url.searchParams.set("sort_by", "2");
    try {
      return await boundedOperation(deadline.signal, Math.min(24_000, deadline.expiresAt - Date.now()), async signal => {
        const response = await this.fetchImplementation(url, { signal, redirect: "error" });
        if (signal.aborted || !response.ok) {
          void response.body?.cancel().catch(() => undefined);
          if (!signal.aborted && response.status === 429) throw new ShoppingError("UPSTREAM_RATE_LIMITED", 429, parseRetryAfter(response.headers.get("Retry-After")));
          throw new ShoppingError("UPSTREAM_UNAVAILABLE", 502);
        }
        const payload = await readPayload(response, signal);
        if (hasProviderError(payload)) throw new ShoppingError("UPSTREAM_INVALID_RESPONSE", 502);
        const parsed = shoppingResultSchema.safeParse(payload);
        if (!parsed.success) throw new ShoppingError("UPSTREAM_INVALID_RESPONSE", 502);
        return sanitizeData(parsed.data, credentials.apiKey);
      }, new ShoppingError("UPSTREAM_UNAVAILABLE", 502));
    } catch (error: unknown) {
      if (error instanceof ShoppingError) throw error;
      throw new ShoppingError("UPSTREAM_UNAVAILABLE", 502);
    }
  }
}
