import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
export class RadarError extends Error {
  public constructor(public readonly code: "VALIDATION_ERROR" | "NOT_FOUND" | "CONFLICT" | "INTERNAL_ERROR") { super(code); }
}
export function radarResponse(statusCode: number, body: unknown): APIGatewayProxyStructuredResultV2 {
  return { statusCode, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }, body: JSON.stringify(body) };
}
export function radarErrorResponse(error: unknown): APIGatewayProxyStructuredResultV2 {
  const code = error instanceof RadarError ? error.code : "INTERNAL_ERROR";
  const statuses = { VALIDATION_ERROR: 400, NOT_FOUND: 404, CONFLICT: 409, INTERNAL_ERROR: 500 };
  const messages = { VALIDATION_ERROR: "La solicitud de Radar no es válida.", NOT_FOUND: "El contenido no está disponible.", CONFLICT: "Existe un conflicto editorial.", INTERNAL_ERROR: "No fue posible consultar Radar." };
  return radarResponse(statuses[code], { status: "error", code, message: messages[code] });
}
