import type { APIGatewayProxyHandlerV2 } from "aws-lambda";

import { collectionSetsRoute } from "../modules/collection/collection-sets.route";

export const handler: APIGatewayProxyHandlerV2 = async (event) => collectionSetsRoute(event);
