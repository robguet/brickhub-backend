import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getAmazonOffersRoute } from "../modules/amazon-offers/get-amazon-offers.route";

export const handler: APIGatewayProxyHandlerV2 = async event => getAmazonOffersRoute(event);
