import type { APIGatewayProxyHandlerV2 } from "aws-lambda";

import { savedSetsRoute } from "../modules/saved-sets/saved-sets.route";

export const handler: APIGatewayProxyHandlerV2 = async (event) => savedSetsRoute(event);
