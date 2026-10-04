import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { authenticatedUserFromEvent } from "../../shared/authenticated-user";
import { shoppingErrorResponse } from "./shopping-response";
import { ShoppingError, isShoppingErrorCode, type ShoppingErrorCode } from "./shopping.types";
import { GetShoppingProductController } from "./get-shopping-product.controller";
import { GetShoppingProductService } from "./get-shopping-product.service";
import { ScrapeDoRepository } from "./scrapedo.repository";
import { ScrapeDoClient } from "./scrapedo.client";
import { SecretsManagerScrapeDoCredentialsProvider } from "./scrapedo-secret.provider";

export interface ShoppingProductLogContext {
  event: "shopping_product_completed" | "shopping_product_failed";
  requestId: string;
  durationMs: number;
  code?: ShoppingErrorCode;
  storeCount?: number;
}
export interface ShoppingProductRouteDependencies {
  createController?: () => { handle(rawQuery: string): Promise<APIGatewayProxyStructuredResultV2> };
  log?: (context: ShoppingProductLogContext) => void;
  now?: () => number;
}
let service: GetShoppingProductService | undefined;
function createController(): GetShoppingProductController {
  return new GetShoppingProductController(() => {
    service ??= new GetShoppingProductService(new ScrapeDoRepository(new SecretsManagerScrapeDoCredentialsProvider(), new ScrapeDoClient()));
    return service;
  });
}
function logMetadata(response: APIGatewayProxyStructuredResultV2): Pick<ShoppingProductLogContext, "code" | "storeCount"> {
  try {
    const body: unknown = JSON.parse(response.body ?? "{}");
    if (body === null || typeof body !== "object") return {};
    if ("code" in body && isShoppingErrorCode(body.code)) return { code: body.code };
    if ("data" in body && body.data !== null && typeof body.data === "object" && "product_results" in body.data) {
      const product = body.data.product_results;
      if (product !== null && typeof product === "object" && "stores" in product && Array.isArray(product.stores)) return { storeCount: product.stores.length };
    }
  } catch { /* Never log malformed response bodies. */ }
  return {};
}
export async function getShoppingProductRoute(
  event: APIGatewayProxyEventV2,
  dependencies: ShoppingProductRouteDependencies = {},
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
  const metadata: ShoppingProductLogContext = {
    event: (response.statusCode ?? 500) < 400 ? "shopping_product_completed" : "shopping_product_failed",
    requestId: event.requestContext.requestId,
    durationMs: Math.max(0, now() - started),
    ...logMetadata(response),
  };
  // Diagnostic failures cannot replace a completed public response.
  try { (dependencies.log ?? (context => console.info(JSON.stringify(context))))(metadata); } catch { /* No raw logger errors. */ }
  return response;
}
