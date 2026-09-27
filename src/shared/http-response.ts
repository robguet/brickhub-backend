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
