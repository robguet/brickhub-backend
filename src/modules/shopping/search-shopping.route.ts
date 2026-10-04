import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { authenticatedUserFromEvent } from "../../shared/authenticated-user";
import { shoppingErrorResponse } from "./shopping-response";
import { ShoppingError, isShoppingErrorCode, type ShoppingErrorCode } from "./shopping.types";
import { SearchShoppingController } from "./search-shopping.controller";
import { SearchShoppingService } from "./search-shopping.service";
import { ScrapeDoRepository } from "./scrapedo.repository";
import { ScrapeDoClient } from "./scrapedo.client";
import { SecretsManagerScrapeDoCredentialsProvider } from "./scrapedo-secret.provider";

export interface ShoppingLogContext {
  event: "shopping_search_completed" | "shopping_search_failed";
  requestId: string;
  durationMs: number;
  code?: ShoppingErrorCode;
  resultCount?: number;
}
export interface ShoppingRouteDependencies {
  createController?: () => { handle(rawQuery: string): Promise<APIGatewayProxyStructuredResultV2> };
  log?: (context: ShoppingLogContext) => void;
  now?: () => number;
}
let service: SearchShoppingService | undefined;
function createController(): SearchShoppingController {
  return new SearchShoppingController(() => {
    service ??= new SearchShoppingService(new ScrapeDoRepository(new SecretsManagerScrapeDoCredentialsProvider(), new ScrapeDoClient()));
    return service;
  });
}
function logMetadata(response: APIGatewayProxyStructuredResultV2): Pick<ShoppingLogContext, "code" | "resultCount"> {
  try {
    const body: unknown = JSON.parse(response.body ?? "{}");
    if (body === null || typeof body !== "object") return {};
    if ("code" in body && isShoppingErrorCode(body.code)) return { code: body.code };
    if ("data" in body && body.data !== null && typeof body.data === "object" && "shopping_results" in body.data && Array.isArray(body.data.shopping_results)) {
      return { resultCount: body.data.shopping_results.length };
    }
  } catch { /* Never log malformed response bodies. */ }
  return {};
}
export async function searchShoppingRoute(
  event: APIGatewayProxyEventV2,
  dependencies: ShoppingRouteDependencies = {},
): Promise<APIGatewayProxyStructuredResultV2> {
  const now = dependencies.now ?? Date.now;
  const started = now();
  let response: APIGatewayProxyStructuredResultV2;
  const authorizationHeaders = Object.entries(event.headers).filter(([key]) => key.toLowerCase() === "authorization");
  const authorization = authorizationHeaders[0]?.[1];
  if (authorizationHeaders.length !== 1 || !authorization || !/^Bearer[ \t]+[^\s,]+$/i.test(authorization) || !authenticatedUserFromEvent(event)) {
    response = shoppingErrorResponse(new ShoppingError("UNAUTHENTICATED", 401));
  } else {
    try { response = await (dependencies.createController ?? createController)().handle(event.rawQueryString); }
    catch { response = shoppingErrorResponse(new ShoppingError("INTERNAL_ERROR", 500)); }
  }
  const metadata: ShoppingLogContext = {
    event: (response.statusCode ?? 500) < 400 ? "shopping_search_completed" : "shopping_search_failed",
    requestId: event.requestContext.requestId,
    durationMs: Math.max(0, now() - started),
    ...logMetadata(response),
  };
  // Diagnostic failures cannot replace a completed public response.
  try { (dependencies.log ?? (context => console.info(JSON.stringify(context))))(metadata); } catch { /* No raw logger errors. */ }
  return response;
}
