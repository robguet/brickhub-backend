import { describe,expect,it } from "vitest";
import { searchShoppingRoute } from "../../../src/modules/shopping/search-shopping.route";
import { SearchShoppingController } from "../../../src/modules/shopping/search-shopping.controller";
import { SearchShoppingService } from "../../../src/modules/shopping/search-shopping.service";
import { sample,shoppingEvent } from "../../fixtures/shopping/helpers";
describe("shopping handler flow",()=>{
 it("adapts HTTP v2 and preserves the provided 40 offers",async()=>{
  const data=sample();const createController=()=>new SearchShoppingController(()=>new SearchShoppingService({search:async()=>data}));
  const response=await searchShoppingRoute(shoppingEvent(),{createController});
  expect(response.statusCode).toBe(200);expect(JSON.parse(response.body!)).toEqual({status:"success",data});
 });
});
it("rejects auth before query and rejects query before constructing a service",async()=>{
 const {vi}=await import("vitest");const createService=vi.fn();const createController=()=>new SearchShoppingController(createService);
 expect((await searchShoppingRoute(shoppingEvent("q=",false),{createController})).statusCode).toBe(401);
 expect((await searchShoppingRoute(shoppingEvent("q=",true),{createController})).statusCode).toBe(400);
 expect(createService).not.toHaveBeenCalled();
});
it("passes explicit and partial markets without changing query text",async()=>{
 const {vi}=await import("vitest");const search=vi.fn().mockResolvedValue({shopping_results:[]});const createController=()=>new SearchShoppingController(()=>new SearchShoppingService({search}));
 const params=new URLSearchParams({q:"LEGO México & +,",hl:"en",gl:"us",google_domain:"google.com",location:"United States"});
 expect((await searchShoppingRoute(shoppingEvent(params.toString()),{createController})).statusCode).toBe(200);
 expect(search.mock.calls[0]?.[0]).toEqual(Object.fromEntries(params));
 await searchShoppingRoute(shoppingEvent("q=x&gl=us"),{createController});
 expect(search.mock.calls[1]?.[0]).toMatchObject({q:"x",gl:"us",hl:"es-mx",google_domain:"google.com.mx",location:"Mexico"});
});
it.each([500,502,429])("returns safe typed %s errors and logs only metadata",async status=>{
 const {vi}=await import("vitest");const {ShoppingError}=await import("../../../src/modules/shopping/shopping.types");
 const code=status===500?"INTERNAL_ERROR":status===429?"UPSTREAM_RATE_LIMITED":"UPSTREAM_UNAVAILABLE";
 const search=vi.fn().mockRejectedValue(new ShoppingError(code,status as 500|502|429,10));const log=vi.fn();
 const response=await searchShoppingRoute(shoppingEvent(),{createController:()=>new SearchShoppingController(()=>new SearchShoppingService({search})),log});
 expect(response.statusCode).toBe(status);expect(JSON.parse(response.body!)).toMatchObject({status:"error",code});
 expect(log).toHaveBeenCalledWith(expect.objectContaining({event:"shopping_search_failed",code,requestId:"test-request"}));
 expect(JSON.stringify(log.mock.calls)).not.toContain("test-session");expect(JSON.stringify(log.mock.calls)).not.toContain("LEGO");
});
it("maps unexpected failures without leaking URL or credential from the error",async()=>{
 const {vi}=await import("vitest");const log=vi.fn();const search=vi.fn().mockRejectedValue(new Error("Authorization Bearer test-session https://api.scrape.do/?token=fake-key"));
 const response=await searchShoppingRoute(shoppingEvent(),{createController:()=>new SearchShoppingController(()=>new SearchShoppingService({search})),log});
 expect(response.statusCode).toBe(500);expect(response.body).not.toContain("test-session");expect(response.body).not.toContain("fake-key");expect(JSON.stringify(log.mock.calls)).not.toContain("test-session");expect(JSON.stringify(log.mock.calls)).not.toContain("fake-key");
});
it("uses actual repository, secret adapter and client together with only mocked I/O",async()=>{
 const {vi}=await import("vitest");const {ScrapeDoRepository}=await import("../../../src/modules/shopping/scrapedo.repository");const {ScrapeDoClient}=await import("../../../src/modules/shopping/scrapedo.client");const {SecretsManagerScrapeDoCredentialsProvider}=await import("../../../src/modules/shopping/scrapedo-secret.provider");
 const send=vi.fn().mockResolvedValue({SecretString:'{"SCRAPE_DO_API_KEY":"fixture-key"}'});const request=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(sample())));
 const repo=new ScrapeDoRepository(new SecretsManagerScrapeDoCredentialsProvider("test-arn",{send}),new ScrapeDoClient(request));const log=vi.fn();
 const response=await searchShoppingRoute(shoppingEvent(),{createController:()=>new SearchShoppingController(()=>new SearchShoppingService(repo)),log});
 const body=JSON.parse(response.body!);
 expect(body.data.shopping_results).toHaveLength(40);expect(body.data.search_information.total_results).toBe(0);expect(body.data.shopping_results[0].product_id).toBe("6789801949246787910");
 expect(body.data.shopping_results[0].extracted_price).toBe(1251.89);expect(send).toHaveBeenCalledTimes(1);expect(request).toHaveBeenCalledTimes(1);
 expect(log).toHaveBeenCalledWith(expect.objectContaining({resultCount:40}));expect(response.body).not.toContain("fixture-key");
});
it("the exported Lambda handler rejects an anonymous HTTP event without network access",async()=>{
 const {handler}=await import("../../../src/handlers/search-shopping");const {vi}=await import("vitest");
 const fetchSpy=vi.spyOn(globalThis,"fetch");const consoleSpy=vi.spyOn(console,"info").mockImplementation(()=>{});
 try{
  const response=await handler(shoppingEvent("q=",false),{} as never,()=>{});
  expect(response).toMatchObject({statusCode:401});expect(fetchSpy).not.toHaveBeenCalled();expect(JSON.stringify(response)).not.toContain("stack");
 }finally{fetchSpy.mockRestore();consoleSpy.mockRestore();}
});
it("a secret timeout returns 500 without ever calling shopping",async()=>{
 const {vi}=await import("vitest");const {ScrapeDoRepository}=await import("../../../src/modules/shopping/scrapedo.repository");const {SecretsManagerScrapeDoCredentialsProvider}=await import("../../../src/modules/shopping/scrapedo-secret.provider");
 vi.useFakeTimers();
 try{
  const send=vi.fn().mockImplementation(()=>new Promise(()=>{}));const search=vi.fn();const log=vi.fn();
  const repo=new ScrapeDoRepository(new SecretsManagerScrapeDoCredentialsProvider("test-arn",{send}),{search});
  const pending=searchShoppingRoute(shoppingEvent(),{createController:()=>new SearchShoppingController(()=>new SearchShoppingService(repo)),log});
  await vi.advanceTimersByTimeAsync(2000);const response=await pending;
  expect(response.statusCode).toBe(500);expect(send).toHaveBeenCalledTimes(1);expect(search).not.toHaveBeenCalled();expect(log).toHaveBeenCalledWith(expect.objectContaining({code:"INTERNAL_ERROR",durationMs:2000}));
 }finally{vi.useRealTimers();}
});
it("an excessive final response becomes a safe 502 with matching log metadata",async()=>{
 const {vi}=await import("vitest");const log=vi.fn();
 const response=await searchShoppingRoute(shoppingEvent(),{createController:()=>new SearchShoppingController(()=>new SearchShoppingService({search:async()=>({shopping_results:[{position:1,title:"é".repeat(3*1024*1024)}]})})),log});
 expect(response.statusCode).toBe(502);expect(response.body!.length).toBeLessThan(1000);expect(log).toHaveBeenCalledWith(expect.objectContaining({code:"UPSTREAM_RESPONSE_TOO_LARGE"}));
});
