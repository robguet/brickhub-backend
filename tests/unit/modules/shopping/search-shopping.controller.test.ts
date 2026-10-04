import { describe,expect,it,vi } from "vitest";
import { SearchShoppingController } from "../../../../src/modules/shopping/search-shopping.controller";
import { SearchShoppingService } from "../../../../src/modules/shopping/search-shopping.service";
import { query,sample } from "../../../fixtures/shopping/helpers";
describe("shopping controller",()=>{
 it("returns the full validated data envelope",async()=>{
  const data=sample();const search=vi.fn().mockResolvedValue(data);const factory=vi.fn(()=>new SearchShoppingService({search}));
  const response=await new SearchShoppingController(factory).handle("q=LEGO+75394");
  expect(JSON.parse(response.body!)).toEqual({status:"success",data});expect(search.mock.calls[0]?.[0]).toEqual(query);
 });
 it.each(["","q=","q=++","q="+"x".repeat(201),"q=x&q=y","q=x&token=client-key"])("rejects %s without constructing provider dependencies",async raw=>{
  const factory=vi.fn();const response=await new SearchShoppingController(factory).handle(raw);
  expect(response.statusCode).toBe(400);expect(factory).not.toHaveBeenCalled();
 });
});
it.each(["q=x&hl=en&hl=es","q=x&gl=","q=x&location=++","q=x&__proto__=y","q=x&url=https://evil.test","q=x&start=10","q=x&device=mobile","q=x&sort_by=1","q=x&userId=other"])("rejects duplicate/unknown/empty input %s before service factory",async raw=>{
 const factory=vi.fn();expect((await new SearchShoppingController(factory).handle(raw)).statusCode).toBe(400);expect(factory).not.toHaveBeenCalled();
});
it("cancels work and returns a safe error at the global deadline",async()=>{
 vi.useFakeTimers();
 try{
  let signal:AbortSignal|undefined;
  const search=vi.fn().mockImplementation((_query,time)=>{signal=time.signal;return new Promise(()=>{});});
  const pending=new SearchShoppingController(()=>new SearchShoppingService({search})).handle("q=x");
  await vi.advanceTimersByTimeAsync(27_000);const response=await pending;
  expect(response.statusCode).toBe(502);expect(signal?.aborted).toBe(true);
 }finally{vi.useRealTimers();}
});
