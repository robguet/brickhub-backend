import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { RadarController } from "../../../src/modules/radar/radar.controller";
import { RadarService } from "../../../src/modules/radar/radar.service";
import { radarRoute } from "../../../src/modules/radar/radar.route";
import { repository } from "./helpers";
import type { RadarRepository } from "../../../src/modules/radar/radar.types";
export function event(path: string, query = ""): APIGatewayProxyEventV2 {
  return { version: "2.0", routeKey: `GET ${path.includes("/posts/") ? "/v1/radar/posts/{slug}" : path}`, rawPath: path, rawQueryString: query, headers: { authorization: "Bearer fixture-token" }, requestContext: { requestId: "radar-fixture", http: { method: "GET", path }, authorizer: { jwt: { claims: { sub: "reader" } } } } } as unknown as APIGatewayProxyEventV2;
}
export function request(path: string, query = "", overrides: Partial<RadarRepository> = {}) {
  return radarRoute(event(path, query), { createController: () => new RadarController(new RadarService(repository(overrides))), log: () => {} });
}
