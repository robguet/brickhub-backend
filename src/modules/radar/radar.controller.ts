import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { z } from "zod";
import { RadarService, type RadarRequest } from "./radar.service";
import { radarErrorResponse, radarResponse, RadarError } from "./radar.http-response";
import { category, civilDate, month, radarSlug } from "./radar.schemas";
const limit = z.string().regex(/^[1-9]\d?$/).transform(Number).pipe(z.number().int().min(1).max(50)).default(20);
const cursor = z.string().min(1).max(4096).regex(/^[A-Za-z0-9_-]+$/).optional();
const list = { limit, cursor };
const postsQuery = z.strictObject({ ...list, category: category.optional() });
const videosQuery = z.strictObject(list);
const releasesQuery = z.strictObject({ ...list, month: month.optional(), from: civilDate.optional() }).refine(value => !(value.month && value.from));
export function requestFromEvent(event: APIGatewayProxyEventV2): RadarRequest {
  const raw = event.rawQueryString ?? "";
  const query: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(raw)) {
    if (Object.prototype.hasOwnProperty.call(query, key)) throw new RadarError("VALIDATION_ERROR");
    query[key] = value;
  }
  // rawQueryString preserves repeated parameters; do not use the collapsed map.
  const path = event.rawPath ?? event.requestContext.http.path;
  if (event.requestContext.http.method !== "GET") throw new RadarError("NOT_FOUND");
  try {
    if (path === "/v1/radar/posts") return { kind: "posts", ...postsQuery.parse(query) };
    if (path === "/v1/radar/videos") return { kind: "videos", ...videosQuery.parse(query) };
    if (path === "/v1/radar/releases") return { kind: "releases", ...releasesQuery.parse(query) };
    z.strictObject({}).parse(query);
    if (path === "/v1/radar/featured") return { kind: "featured" };
    if (path === "/v1/radar/config") return { kind: "config" };
    const match = /^\/v1\/radar\/posts\/([^/]+)$/.exec(path);
    if (match?.[1]) return { kind: "detail", slug: radarSlug.parse(decodeURIComponent(match[1])) };
  } catch { throw new RadarError("VALIDATION_ERROR"); }
  throw new RadarError("NOT_FOUND");
}
export class RadarController {
  public constructor(private readonly service: RadarService) {}
  public async handle(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
    try { return radarResponse(200, { status: "success", data: await this.service.execute(requestFromEvent(event)) }); }
    catch (error) { return radarErrorResponse(error); }
  }
}
