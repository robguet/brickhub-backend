import { z } from "zod";

const nullableString = z.string().nullish();
const nonnegative = z.number().finite().nonnegative().nullish();
const nonnegativeInteger = z.number().int().nonnegative().nullish();
const httpUrl = z.string().refine(value => {
  try { return ["https:", "http:"].includes(new URL(value).protocol); } catch { return false; }
}, "Invalid HTTP URL");
const image = z.union([httpUrl, z.string().regex(/^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/)]).nullish();
const product = z.object({
  position: z.number().int().positive(),
  title: z.string().min(1),
  product_id: z.string().min(1).nullish(),
  catalog_id: z.string().min(1).nullish(),
  product_link: httpUrl.nullish(),
  source: nullableString,
  source_icon: image,
  price: nullableString,
  extracted_price: nonnegative,
  rating: z.number().finite().min(0).max(5).nullish(),
  reviews: nonnegativeInteger,
  thumbnail: image,
  immersive_product_page_token: nullableString,
  installment: z.object({ text: nullableString }).nullish(),
  alternative_price: z.object({ price: nullableString, extracted_price: nonnegative }).nullish(),
});
export const shoppingResultSchema = z.object({
  shopping_results: z.array(product),
  search_parameters: z.object({
    engine: nullableString, q: nullableString, google_domain: nullableString,
    hl: nullableString, gl: nullableString, device: nullableString,
    location: nullableString, uule: nullableString, start: nonnegativeInteger, sort_by: nonnegativeInteger,
  }).nullish(),
  search_information: z.object({
    page_title: nullableString, query_displayed: nullableString, organic_results_state: nullableString,
    shopping_results_state: nullableString, results_for: nullableString, country: nullableString,
    city: nullableString, total_results: nonnegativeInteger, time_taken_displayed: nonnegative,
  }).nullish(),
  filters: z.array(z.object({
    input_type: nullableString,
    type: nullableString,
    options: z.array(z.object({ text: nullableString, shoprs: nullableString })).nullish(),
  })).nullish(),
  // Provider links are validated and rebuilt before the public response.
  pagination: z.object({ current: nonnegativeInteger, next: nullableString, previous: nullableString }).nullish(),
  categorized_shopping_results: z.array(z.object({ title: z.string(), shopping_results: z.array(product) })).nullish(),
});
export const shoppingMarketShape = {
  hl: z.string().trim().regex(/^[a-z]{2,3}(?:-[a-z]{2})?$/i).default("es-mx"), gl: z.string().trim().regex(/^[a-z]{2}$/i).default("mx"),
  google_domain: z.string().trim().regex(/^google\.(?:com|[a-z]{2}|(?:com|co)\.[a-z]{2})$/i).default("google.com.mx"),
  location: z.string().trim().min(1).max(200).refine(value => !/\p{Cc}/u.test(value)).default("Mexico"),
};
export const shoppingQuerySchema = z.object({ q: z.string().trim().min(1).max(200), ...shoppingMarketShape }).strict();
