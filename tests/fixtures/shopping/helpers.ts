import { readFileSync } from "node:fs";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import type { ShoppingSearchData, ShoppingDeadline, ShoppingQuery } from "../../../src/modules/shopping/shopping.types";
export const query: ShoppingQuery = { q: "LEGO 75394", hl: "es-mx", gl: "mx", google_domain: "google.com.mx", location: "Mexico" };
export const sample = (): ShoppingSearchData => JSON.parse(readFileSync("tests/fixtures/shopping/mexico-shopping.json", "utf8")) as ShoppingSearchData;
export const deadline = (): ShoppingDeadline => ({signal:new AbortController().signal,expiresAt:Date.now()+27_000});
export function shoppingEvent(rawQueryString = "q=LEGO+75394", authenticated = true): APIGatewayProxyEventV2 {
  return { headers: authenticated ? {authorization:"Bearer test-session"} : {}, rawQueryString, requestContext: { http: {method:"GET",path:"/v1/shopping/search"},requestId:"test-request", ...(authenticated ? {authorizer:{jwt:{claims:{sub:"test-user"}}}} : {}) } } as unknown as APIGatewayProxyEventV2;
}
