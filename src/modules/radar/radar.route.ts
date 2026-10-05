import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { authenticatedUserFromEvent } from "../../shared/authenticated-user";
import { RadarController } from "./radar.controller";
import { RadarService } from "./radar.service";
import { DynamoDbRadarRepository } from "./dynamodb-radar.repository";
import { radarErrorResponse, radarResponse } from "./radar.http-response";
export interface RadarLog { event: "radar_completed" | "radar_failed"; requestId: string; route: string; durationMs: number; statusCode: number; code?: string; resultCount?: number; }
export interface RadarRouteDependencies { createController?: () => RadarController; log?: (context: RadarLog) => void; now?: () => number; }
let controller: RadarController | undefined;
export async function radarRoute(event: APIGatewayProxyEventV2, dependencies: RadarRouteDependencies = {}): Promise<APIGatewayProxyStructuredResultV2> {
  const now = dependencies.now ?? Date.now;
  const started = now();
  const authorizationHeaders = Object.entries(event.headers).filter(([key]) => key.toLowerCase() === "authorization");
  const authorization = authorizationHeaders[0]?.[1];
  let response: APIGatewayProxyStructuredResultV2;
  if (authorizationHeaders.length !== 1 || !authorization || !/^Bearer[ \t]+[^\s,]+$/i.test(authorization) || !authenticatedUserFromEvent(event)) {
    response = radarResponse(401, { status: "error", code: "UNAUTHENTICATED", message: "La autenticación es requerida." });
  } else {
    try {
      const instance = dependencies.createController ? dependencies.createController() : controller ??= new RadarController(new RadarService(new DynamoDbRadarRepository()));
      response = await instance.handle(event);
    } catch (error) { response = radarErrorResponse(error); }
  }
  const statusCode = response.statusCode ?? 500;
  const context: RadarLog = { event: statusCode < 400 ? "radar_completed" : "radar_failed", requestId: event.requestContext.requestId, route: event.routeKey ?? "unknown", durationMs: Math.max(0, now() - started), statusCode };
  try {
    const body: unknown = JSON.parse(response.body ?? "{}");
    if (body !== null && typeof body === "object") {
      if ("code" in body && typeof body.code === "string") context.code = body.code;
      if ("data" in body && body.data !== null && typeof body.data === "object") {
        const data = body.data as Record<string, unknown>;
        for (const key of ["posts", "videos", "releases"]) if (Array.isArray(data[key])) context.resultCount = data[key].length;
      }
    }
  } catch { /* only validated response metadata is used for diagnostics */ }
  try { (dependencies.log ?? (value => console.info(JSON.stringify(value))))(context); } catch { /* logging must never change responses */ }
  return response;
}
