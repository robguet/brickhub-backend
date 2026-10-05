import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";

import type { ErrorCode, ErrorResponse, SetSearchResult } from "../modules/sets/set.types";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
} as const;

export function successResponse(body: SetSearchResult): APIGatewayProxyStructuredResultV2 {
  return { statusCode: 200, headers: jsonHeaders, body: JSON.stringify(body) };
}

export function errorResponse(
  statusCode: 400 | 429 | 502,
  code: ErrorCode,
  message: string,
): APIGatewayProxyStructuredResultV2 {
  const body: ErrorResponse = { status: "error", code, message };
  return { statusCode, headers: jsonHeaders, body: JSON.stringify(body) };
}

export function safeLogError(context: { event: string; code: ErrorCode; requestId?: string }): void {
  console.error(JSON.stringify(context));
}

const collectionJsonHeaders = {
  "content-type": "application/json; charset=utf-8",
} as const;

export function collectionSuccessResponse(
  statusCode: 200 | 201,
  data: unknown,
): APIGatewayProxyStructuredResultV2 {
  return { statusCode, headers: collectionJsonHeaders, body: JSON.stringify({ status: "success", data }) };
}

export function collectionErrorResponse(
  statusCode: 400 | 401 | 404 | 409 | 500,
  code: string,
  message: string,
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: collectionJsonHeaders,
    body: JSON.stringify({ status: "error", code, message }),
  };
}

export function profileSuccessResponse(data: { profile: unknown; created?: boolean }): APIGatewayProxyStructuredResultV2 {
  return { statusCode: 200, headers: collectionJsonHeaders, body: JSON.stringify({ status: "success", ...data }) };
}

export function amazonOffersSuccessResponse(offers: unknown[]): APIGatewayProxyStructuredResultV2 {
  return { statusCode: 200, headers: collectionJsonHeaders, body: JSON.stringify({ status: "success", data: { offers } }) };
}

export function amazonOffersErrorResponse(): APIGatewayProxyStructuredResultV2 {
  return { statusCode: 500, headers: collectionJsonHeaders, body: JSON.stringify({ status: "error", code: "INTERNAL_ERROR", message: "No fue posible consultar las ofertas de Amazon." }) };
}

export function amazonOffersUnauthenticatedResponse(): APIGatewayProxyStructuredResultV2 {
  return { statusCode: 401, headers: collectionJsonHeaders, body: JSON.stringify({ status: "error", code: "UNAUTHENTICATED", message: "La autenticación es requerida." }) };
}
