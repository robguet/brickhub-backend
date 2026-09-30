import type { APIGatewayProxyHandlerV2 } from "aws-lambda";

import { profileRoute } from "../modules/profile/profile.route";

export const handler: APIGatewayProxyHandlerV2 = async (event) => profileRoute(event);
