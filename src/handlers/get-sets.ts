import type { APIGatewayProxyHandlerV2 } from "aws-lambda";

import { getSetsRoute } from "../modules/sets/get-sets.route";

export const handler: APIGatewayProxyHandlerV2 = async (event) => getSetsRoute(event);
