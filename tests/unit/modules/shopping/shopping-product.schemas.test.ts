import { expect,it } from "vitest";
import { shoppingProductResultSchema } from "../../../../src/modules/shopping/shopping-product.schemas";
import { productSample } from "../../../fixtures/shopping/product-helpers";
it("preserves all33 stores and8 options including absent prices and exact decimals",()=>{
 const sample=productSample(); const parsed=shoppingProductResultSchema.parse(sample); expect(parsed).toEqual(sample);
 expect(parsed.product_results.stores).toHaveLength(33);expect(parsed.product_results.more_options).toHaveLength(8);
 expect(parsed.product_results.stores[0]).not.toHaveProperty("price");expect(parsed.product_results.stores[6]?.extracted_price).toBe(2542.330372);
});
it("accepts empty/null, rejects missing data and numeric IDs",()=>{
 expect(shoppingProductResultSchema.parse({product_results:{title:"Product",stores:[],product_id:null},search_parameters:null}).product_results.stores).toEqual([]);
 for(const data of [{},{product_results:{title:"x"}},{product_results:{title:"x",stores:[],product_id:123}}])expect(shoppingProductResultSchema.safeParse(data).success).toBe(false);
});
