export interface ShoppingQuery {
  q: string;
  hl: string;
  gl: string;
  google_domain: string;
  location: string;
}

export interface ShoppingDeadline {
  signal: AbortSignal;
  expiresAt: number;
}

export interface ShoppingProduct {
  position: number;
  title: string;
  product_id?: string | null;
  catalog_id?: string | null;
  product_link?: string | null;
  source?: string | null;
  source_icon?: string | null;
  price?: string | null;
  extracted_price?: number | null;
  rating?: number | null;
  reviews?: number | null;
  thumbnail?: string | null;
  immersive_product_page_token?: string | null;
  installment?: { text?: string | null } | null;
  alternative_price?: { price?: string | null; extracted_price?: number | null } | null;
}

export interface SearchParameters {
  engine?: string | null;
  q?: string | null;
  google_domain?: string | null;
  hl?: string | null;
  gl?: string | null;
  device?: string | null;
  location?: string | null;
  uule?: string | null;
  start?: number | null;
  sort_by?: number | null;
}

export interface SearchInformation {
  page_title?: string | null;
  query_displayed?: string | null;
  organic_results_state?: string | null;
  shopping_results_state?: string | null;
  results_for?: string | null;
  country?: string | null;
  city?: string | null;
  total_results?: number | null;
  time_taken_displayed?: number | null;
}

export interface ShoppingSearchData {
  shopping_results: ShoppingProduct[];
  search_parameters?: SearchParameters | null;
  search_information?: SearchInformation | null;
  filters?: { input_type?: string | null; type?: string | null; options?: { text?: string | null; shoprs?: string | null }[] | null }[] | null;
  pagination?: { current?: number | null; next?: string | null; previous?: string | null } | null;
  categorized_shopping_results?: { title: string; shopping_results: ShoppingProduct[] }[] | null;
}

export interface ShoppingCatalog {
  search(query: ShoppingQuery, deadline: ShoppingDeadline): Promise<ShoppingSearchData>;
}

export interface ShoppingCredentials { apiKey: string }
export interface ScrapeDoCredentialsProvider {
  getCredentials(deadline: ShoppingDeadline): Promise<ShoppingCredentials>;
}
export interface ShoppingProviderClient {
  search(credentials: ShoppingCredentials, query: ShoppingQuery, deadline: ShoppingDeadline): Promise<ShoppingSearchData>;
}

export type ShoppingErrorCode = "VALIDATION_ERROR" | "UNAUTHENTICATED" | "INTERNAL_ERROR" | "UPSTREAM_RATE_LIMITED" | "UPSTREAM_UNAVAILABLE" | "UPSTREAM_INVALID_RESPONSE" | "UPSTREAM_RESPONSE_TOO_LARGE";
export type ShoppingErrorStatus = 400 | 401 | 429 | 500 | 502;
const messages: Record<ShoppingErrorCode, string> = {
  VALIDATION_ERROR: "La consulta de búsqueda no es válida.",
  UNAUTHENTICATED: "Se requiere una credencial Bearer válida.",
  INTERNAL_ERROR: "La búsqueda no está disponible en este momento.",
  UPSTREAM_RATE_LIMITED: "La búsqueda está temporalmente limitada. Intenta más tarde.",
  UPSTREAM_UNAVAILABLE: "El proveedor de búsqueda no está disponible en este momento.",
  UPSTREAM_INVALID_RESPONSE: "El proveedor devolvió una respuesta inválida.",
  UPSTREAM_RESPONSE_TOO_LARGE: "La respuesta de búsqueda supera el tamaño permitido.",
};
export class ShoppingError extends Error {
  public constructor(public readonly code: ShoppingErrorCode, public readonly statusCode: ShoppingErrorStatus, public readonly retryAfter?: number) {
    super(messages[code]);
  }
}

export function isShoppingErrorCode(value: unknown): value is ShoppingErrorCode {
  return typeof value === "string" && Object.hasOwn(messages, value);
}
