import type { ShoppingProductData } from "./shopping-product.types";
import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { ShoppingError, type ShoppingSearchData } from "./shopping.types";
const headers = { "content-type": "application/json; charset=utf-8" };
const MAX_PROXY_BYTES = 5 * 1024 * 1024;
function validRetryAfter(value: number | undefined): value is number {
  return value !== undefined && Number.isInteger(value) && value >= 1 && value <= 86_400;
}
export function shoppingErrorResponse(error: ShoppingError): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode: error.statusCode,
    headers: { ...headers, ...(error.statusCode === 429 && validRetryAfter(error.retryAfter) ? { "retry-after": String(error.retryAfter) } : {}) },
    body: JSON.stringify({ status: "error", code: error.code, message: error.message }),
  };
}
export function shoppingSuccessResponse(data: ShoppingSearchData | ShoppingProductData): APIGatewayProxyStructuredResultV2 {
  const response = { statusCode: 200, headers, body: JSON.stringify({ status: "success", data }) };
  if (Buffer.byteLength(JSON.stringify(response), "utf8") > MAX_PROXY_BYTES) {
    return shoppingErrorResponse(new ShoppingError("UPSTREAM_RESPONSE_TOO_LARGE", 502));
  }
  return response;
}
export function parseRetryAfter(value: string | null, now = Date.now()): number | undefined {
  if (value === null) return undefined;
  if (/^\d+$/.test(value)) {
    const seconds = Number(value);
    return validRetryAfter(seconds) ? seconds : undefined;
  }
  const date = Date.parse(value);
  if (!Number.isFinite(date) || new Date(date).toUTCString() !== value) return undefined;
  const seconds = Math.ceil((date - now) / 1000);
  return validRetryAfter(seconds) ? seconds : undefined;
}
