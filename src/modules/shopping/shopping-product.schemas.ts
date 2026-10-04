import { z } from "zod";
import { shoppingQuerySchema } from "./shopping.schemas";
const text = z.string().nullish();
const id = z.string().min(1).nullish();
const amount = z.number().finite().nonnegative().nullish();
const http = z.string().refine(value => { try { const url=new URL(value); return ["http:","https:"].includes(url.protocol) && !url.username && !url.password; } catch { return false; } });
const image = z.union([http,z.string().regex(/^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/)]).nullish();
export const shoppingProductQuerySchema = shoppingQuerySchema.extend({ catalog_id: z.string().trim().regex(/^(?=[0-9]*[1-9])[0-9]{1,100}$/) });
export const shoppingProductResultSchema = z.object({
 product_results:z.object({
 title:z.string().min(1),product_id:id,
 stores:z.array(z.object({position:z.number().int().positive(),name:z.string().min(1),
 link:http.nullish(),title:text,tag:text,merchant_id:id,logo:image,thumbnail:image,
 rating:z.number().finite().min(0).max(5).nullish(),reviews:z.number().int().nonnegative().nullish(),
 price:text,extracted_price:amount,currency:text,shipping:text,shipping_extracted:amount,tax_hint:text,
 total:text,extracted_total:amount,details_and_offers:z.array(z.string()).nullish()})),
 more_options:z.array(z.object({title:z.string().min(1),product_id:z.string().min(1)})).nullish(),
 extension_ids:z.object({catalog_id:id}).nullish(),source:text,
 }),
 search_parameters:z.object({catalog_id:id,product_id:id,engine:text,q:text,hl:text,gl:text,google_domain:text,location:text,device:text,load_all_stores:z.boolean().nullish(),more_stores:z.boolean().nullish()}).nullish(),
});
