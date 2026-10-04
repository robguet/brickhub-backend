import { describe, expect, it, vi } from "vitest";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { searchShoppingRoute } from "../../../../src/modules/shopping/search-shopping.route";
function event(headers: Record<string,string> = {}, claims?: Record<string,string | undefined>): APIGatewayProxyEventV2 {
  return { headers, rawQueryString: "q=", requestContext: { http: { method: "GET" }, requestId: "request-1", authorizer: { jwt: { claims } } } } as unknown as APIGatewayProxyEventV2;
}
describe("shopping authentication boundary", () => {
  it.each([event(), event({authorization:"Bearer session"})])("rejects missing Bearer or verified sub before constructing dependencies", async input => {
    const createController = vi.fn();
    const response = await searchShoppingRoute(input, {createController});
    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body!)).toMatchObject({status:"error",code:"UNAUTHENTICATED"});
    expect(createController).not.toHaveBeenCalled();
  });
});

describe("complete authentication matrix",()=>{
  it.each(["", "Bearer", "Bearer  ", "Basic session", "Bearer one two", "Bearer session,other"])("rejects malformed credential %j",async authorization=>{
    const createController=vi.fn();const response=await searchShoppingRoute(event({Authorization:authorization},{sub:"user"}),{createController});
    expect(response.statusCode).toBe(401);expect(createController).not.toHaveBeenCalled();
  });
  it.each([{}, {sub:""}, {sub:"  "}])("requires verified nonempty sub %j",async claims=>{
    const createController=vi.fn();expect((await searchShoppingRoute(event({authorization:"Bearer session"},claims),{createController})).statusCode).toBe(401);
    expect(createController).not.toHaveBeenCalled();
  });
  it("accepts case insensitive headers and Bearer scheme",async()=>{
    const handle=vi.fn().mockResolvedValue({statusCode:200,body:"{}"});
    const response=await searchShoppingRoute(event({AUTHORIZATION:"bearer session"},{sub:"user"}),{createController:()=>({handle})});
    expect(response.statusCode).toBe(200);expect(handle).toHaveBeenCalledExactlyOnceWith("q=");
  });
  it("rejects ambiguous duplicate authorization headers",async()=>{
    const createController=vi.fn();expect((await searchShoppingRoute(event({Authorization:"Bearer valid",authorization:"Basic other"},{sub:"user"}),{createController})).statusCode).toBe(401);
    expect(createController).not.toHaveBeenCalled();
  });
});
