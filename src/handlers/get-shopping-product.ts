import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getShoppingProductRoute } from "../modules/shopping/get-shopping-product.route";
export const handler: APIGatewayProxyHandlerV2 = async event => getShoppingProductRoute(event);
