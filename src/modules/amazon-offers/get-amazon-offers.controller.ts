import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";

import { amazonOffersErrorResponse, amazonOffersSuccessResponse } from "../../shared/http-response";
import type { GetAmazonOffersService } from "./get-amazon-offers.service";

export class GetAmazonOffersController {
  public constructor(private readonly service: GetAmazonOffersService) {}
  public async handle(): Promise<APIGatewayProxyStructuredResultV2> {
    try { return amazonOffersSuccessResponse(await this.service.list()); }
    catch { return amazonOffersErrorResponse(); }
  }
}
