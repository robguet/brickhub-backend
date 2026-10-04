import {describe,expect,it} from "vitest";
import { shoppingSuccessResponse,shoppingErrorResponse,parseRetryAfter } from "../../../../src/modules/shopping/shopping-response";
import { ShoppingError } from "../../../../src/modules/shopping/shopping.types";
describe("bounded public envelopes",()=>{
 it("measures the full escaped proxy JSON in UTF-8 and returns a small size error",()=>{
  const response=shoppingSuccessResponse({shopping_results:[{position:1,title:"é".repeat(3*1024*1024)}]});
  expect(response.statusCode).toBe(502);expect(response.body!.length).toBeLessThan(1000);expect(JSON.parse(response.body!)).toMatchObject({code:"UPSTREAM_RESPONSE_TOO_LARGE"});
 });
 it("propagates only bounded integer Retry-After on 429",()=>{
  expect(shoppingErrorResponse(new ShoppingError("UPSTREAM_RATE_LIMITED",429,10)).headers).toMatchObject({"retry-after":"10"});
  expect(shoppingErrorResponse(new ShoppingError("UPSTREAM_RATE_LIMITED",429,999999)).headers).not.toHaveProperty("retry-after");
 });
 it.each([["1",1],["86400",86400],["0",undefined],["86401",undefined],["nonsense",undefined],["1.5",undefined],[null,undefined]])("interprets Retry-After %s",(value,expected)=>expect(parseRetryAfter(value as string|null,0)).toBe(expected));
 it("accepts only a valid future HTTP date within one day",()=>{
  const now=Date.UTC(2026,9,4,12);expect(parseRetryAfter(new Date(now+10_000).toUTCString(),now)).toBe(10);
  expect(parseRetryAfter(new Date(now-1000).toUTCString(),now)).toBeUndefined();
  expect(parseRetryAfter("2026-10-04T12:00:10Z",now)).toBeUndefined();
 });
});
