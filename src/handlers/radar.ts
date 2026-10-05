import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { radarRoute } from "../modules/radar/radar.route";
export const handler: APIGatewayProxyHandlerV2 = async event => radarRoute(event);
