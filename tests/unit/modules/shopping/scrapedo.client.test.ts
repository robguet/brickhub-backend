import { describe,expect,it,vi } from "vitest";
import { ScrapeDoClient } from "../../../../src/modules/shopping/scrapedo.client";
import { deadline,query,sample } from "../../../fixtures/shopping/helpers";
describe("ScrapeDo shopping HTTP client",()=>{
 it("fetches one initial page with backend credentials, fixed settings and Mexican market",async()=>{
  const data=sample();const request=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(data)));
  expect(await new ScrapeDoClient(request).search({apiKey:"fake-provider-key"},query,deadline())).toEqual(data);
  expect(request).toHaveBeenCalledTimes(1);
  const url=new URL(String(request.mock.calls[0]?.[0]));
  expect(url.origin+url.pathname).toBe("https://api.scrape.do/plugin/google/shopping");
  expect(Object.fromEntries(url.searchParams)).toEqual({...query,token:"fake-provider-key",device:"desktop",sort_by:"2"});
  expect(request.mock.calls[0]?.[1]).toMatchObject({redirect:"error"});
  expect(request.mock.calls[0]?.[1]?.headers).toBeUndefined();
 });
 it("keeps an empty provider list as success",async()=>{
  const request=vi.fn<typeof fetch>().mockResolvedValue(new Response('{"shopping_results":[]}'));
  expect(await new ScrapeDoClient(request).search({apiKey:"fake-key"},query,deadline())).toEqual({shopping_results:[]});
 });
});
it("encodes special search text and preserves all explicit market values",async()=>{
 const request=vi.fn<typeof fetch>().mockResolvedValue(new Response('{"shopping_results":[]}'));
 const market={q:"LEGO México & +, 75394",hl:"en",gl:"us",google_domain:"google.com",location:"United States"};
 await new ScrapeDoClient(request).search({apiKey:"fake-key"},market,deadline());
 const url=new URL(String(request.mock.calls[0]?.[0]));
 expect(url.searchParams.get("q")).toBe(market.q);expect([...url.searchParams.keys()]).toHaveLength(8);
 for(const [key,value]of Object.entries(market))expect(url.searchParams.get(key)).toBe(value);
});

it.each([[429,"UPSTREAM_RATE_LIMITED",429],[401,"UPSTREAM_UNAVAILABLE",502],[403,"UPSTREAM_UNAVAILABLE",502],[502,"UPSTREAM_UNAVAILABLE",502]])("maps provider HTTP %s safely",async(status,code,statusCode)=>{
 const request=vi.fn<typeof fetch>().mockResolvedValue(new Response('fake-provider-key raw error',{status:Number(status),headers:{"Retry-After":"10"}}));
 await expect(new ScrapeDoClient(request).search({apiKey:"fake-provider-key"},query,deadline())).rejects.toMatchObject({code,statusCode});
 expect(request).toHaveBeenCalledTimes(1);
});
it.each(["not-json",'{"error":"fake-key vendor error","shopping_results":[]}','{"search_information":{"total_results":0}}','{"shopping_results":[{"title":"x"}]}'])("maps malformed payload to safe invalid-response error",async body=>{
 const request=vi.fn<typeof fetch>().mockResolvedValue(new Response(body));
 await expect(new ScrapeDoClient(request).search({apiKey:"fake-key"},query,deadline())).rejects.toMatchObject({code:"UPSTREAM_INVALID_RESPONSE",statusCode:502});
});
it("maps network and redirect failures without retaining raw URL errors",async()=>{
 const request=vi.fn<typeof fetch>().mockRejectedValue(new Error("https://api.scrape.do/?token=fake-key"));
 await expect(new ScrapeDoClient(request).search({apiKey:"fake-key"},query,deadline())).rejects.toMatchObject({code:"UPSTREAM_UNAVAILABLE",message:"El proveedor de búsqueda no está disponible en este momento."});
});
it("enforces real body bytes despite a false Content-Length and cancels the stream",async()=>{
 const cancel=vi.fn();const stream=new ReadableStream<Uint8Array>({start(controller){controller.enqueue(new Uint8Array(4*1024*1024+1));},cancel});
 const request=vi.fn<typeof fetch>().mockResolvedValue(new Response(stream,{headers:{"Content-Length":"1"}}));
 await expect(new ScrapeDoClient(request).search({apiKey:"fake-key"},query,deadline())).rejects.toMatchObject({code:"UPSTREAM_RESPONSE_TOO_LARGE"});
 expect(cancel).toHaveBeenCalled();
});
it("aborts a slow fetch at 24 seconds even if a double ignores abort",async()=>{
 vi.useFakeTimers();
 try{
  let signal:AbortSignal|undefined;
  const request=vi.fn<typeof fetch>().mockImplementation((_url,init)=>{signal=init?.signal??undefined;return new Promise(()=>{});});
  const pending=new ScrapeDoClient(request).search({apiKey:"fake-key"},query,deadline());
  const assertion=expect(pending).rejects.toMatchObject({code:"UPSTREAM_UNAVAILABLE"});
  await vi.advanceTimersByTimeAsync(24_000);await assertion;expect(signal?.aborted).toBe(true);expect(request).toHaveBeenCalledTimes(1);
 }finally{vi.useRealTimers();}
});
it("aborts a stalled body read as well as the header request",async()=>{
 vi.useFakeTimers();
 try{
  const cancel=vi.fn();const stream=new ReadableStream<Uint8Array>({start(controller){controller.enqueue(new TextEncoder().encode('{"shopping_results":'));},cancel});
  const request=vi.fn<typeof fetch>().mockResolvedValue(new Response(stream));
  const pending=new ScrapeDoClient(request).search({apiKey:"fake-key"},query,deadline());
  const assertion=expect(pending).rejects.toMatchObject({code:"UPSTREAM_UNAVAILABLE"});
  await vi.advanceTimersByTimeAsync(24_000);await assertion;expect(cancel).toHaveBeenCalled();
 }finally{vi.useRealTimers();}
});
