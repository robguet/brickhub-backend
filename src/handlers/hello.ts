import type { APIGatewayProxyHandlerV2 } from "aws-lambda";

import { getHello } from "../modules/hello/hello.controller";

export const handler: APIGatewayProxyHandlerV2 = async () => getHello();

