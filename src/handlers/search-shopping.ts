import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { searchShoppingRoute } from "../modules/shopping/search-shopping.route";
export const handler: APIGatewayProxyHandlerV2 = async event => searchShoppingRoute(event);
