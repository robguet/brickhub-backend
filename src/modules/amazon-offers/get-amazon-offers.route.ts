import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";

import { authenticatedUserFromEvent } from "../../shared/authenticated-user";
import { amazonOffersUnauthenticatedResponse } from "../../shared/http-response";
import { DynamoDbAmazonOfferRepository } from "./dynamodb-amazon-offer.repository";
import { GetAmazonOffersController } from "./get-amazon-offers.controller";
import { GetAmazonOffersService } from "./get-amazon-offers.service";

export interface AmazonOffersLogContext { event: "amazon_offers_completed" | "amazon_offers_failed"; requestId: string; durationMs: number; resultCount?: number; code?: "INTERNAL_ERROR" | "UNAUTHENTICATED"; authFailure?: "missing_or_ambiguous_authorization" | "invalid_bearer_syntax" | "missing_verified_sub"; }
export interface AmazonOffersRouteDependencies { createController?: () => GetAmazonOffersController; log?: (context: AmazonOffersLogContext) => void; now?: () => number; }
let controller: GetAmazonOffersController | undefined;
function defaultController(): GetAmazonOffersController {
  controller ??= new GetAmazonOffersController(new GetAmazonOffersService(new DynamoDbAmazonOfferRepository()));
  return controller;
}
export async function getAmazonOffersRoute(event: APIGatewayProxyEventV2, dependencies: AmazonOffersRouteDependencies = {}): Promise<APIGatewayProxyStructuredResultV2> {
  const now = dependencies.now ?? Date.now;
  const started = now();
  let response: APIGatewayProxyStructuredResultV2;
  const authorizationHeaders = Object.entries(event.headers).filter(([key]) => key.toLowerCase() === "authorization");
  const authorization = authorizationHeaders[0]?.[1];
  const authFailure = authorizationHeaders.length !== 1 || !authorization
    ? "missing_or_ambiguous_authorization"
    : !/^Bearer[ \t]+[^\s,]+$/i.test(authorization)
      ? "invalid_bearer_syntax"
      : !authenticatedUserFromEvent(event)
        ? "missing_verified_sub"
        : undefined;
  if (authFailure !== undefined) {
    response = amazonOffersUnauthenticatedResponse();
  } else {
    try { response = await (dependencies.createController ?? defaultController)().handle(); }
    catch { response = { statusCode: 500, headers: { "content-type": "application/json; charset=utf-8" }, body: JSON.stringify({ status: "error", code: "INTERNAL_ERROR", message: "No fue posible consultar las ofertas de Amazon." }) }; }
  }
  let count: number | undefined;
  try { const body: unknown = JSON.parse(response.body ?? "{}"); if (body !== null && typeof body === "object" && "data" in body && body.data !== null && typeof body.data === "object" && "offers" in body.data && Array.isArray(body.data.offers)) count = body.data.offers.length; } catch { /* safe logging only */ }
  const code = response.statusCode === 401 ? "UNAUTHENTICATED" : "INTERNAL_ERROR";
  const context: AmazonOffersLogContext = { event: (response.statusCode ?? 500) < 400 ? "amazon_offers_completed" : "amazon_offers_failed", requestId: event.requestContext.requestId, durationMs: Math.max(0, now() - started), ...(count === undefined ? { code } : { resultCount: count }), ...(authFailure === undefined ? {} : { authFailure }) };
  try { (dependencies.log ?? (value => console.info(JSON.stringify(value))))(context); } catch { /* diagnostics never change responses */ }
  return response;
}
