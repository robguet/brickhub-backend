import {describe,expect,it,vi} from "vitest";
import { ScrapeDoClient } from "../../../../src/modules/shopping/scrapedo.client";
import { deadline,query } from "../../../fixtures/shopping/helpers";
async function search(payload:unknown){return new ScrapeDoClient(vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(payload)))).search({apiKey:"fake-provider-key"},query,deadline());}
describe("provider data confidentiality",()=>{
 it("sanitizes known links and strips unknown credentials without dropping product references",async()=>{
  const data=await search({token:"fake-provider-key",search_parameters:{q:"x",token:"fake-provider-key"},shopping_results:[{position:1,title:"x",apiKey:"fake-provider-key",product_link:"https://shop.example/p?APIKEY=fake-provider-key&item=1",thumbnail:"https://shop.example/i?token=fake-provider-key",immersive_product_page_token:"public-product-reference"}],pagination:{current:0,next:"https://api.scrape.do/plugin/google/shopping?q=x&token=fake-provider-key&start=10&evil=x"}});
  expect(JSON.stringify(data)).not.toContain("fake-provider-key");
  expect(data.shopping_results[0]).toMatchObject({product_link:"https://shop.example/p?item=1",thumbnail:"https://shop.example/i",immersive_product_page_token:"public-product-reference"});
  expect(data.pagination?.next).toBe("/plugin/google/shopping?q=x&start=10");
 });
 it.each(["https://evil.example/plugin/google/shopping?q=x","//evil.example/plugin/google/shopping?q=x","/other?q=x"])("omits foreign continuation %s",async next=>{
  const data=await search({shopping_results:[],pagination:{current:0,next}});expect(data.pagination).toEqual({current:0});
 });
 it.each(["fake-provider-key","prefix fake-provider-key suffix"])("rejects credential reflections in allowed text",async title=>{
  await expect(search({shopping_results:[{position:1,title}]})).rejects.toMatchObject({code:"UPSTREAM_INVALID_RESPONSE"});
 });
 it("rejects URL userinfo and encoded residual secrets",async()=>{
  await expect(search({shopping_results:[{position:1,title:"x",product_link:"https://user:pass@shop.example/p"}]})).rejects.toMatchObject({code:"UPSTREAM_INVALID_RESPONSE"});
  await expect(search({shopping_results:[{position:1,title:"x",product_link:"https://shop.example/p?ref=fake-provider-key"}]})).rejects.toMatchObject({code:"UPSTREAM_INVALID_RESPONSE"});
 });
});
