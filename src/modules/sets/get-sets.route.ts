import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";

import { safeLogError } from "../../shared/http-response";
import { BricksetClient } from "./brickset.client";
import { GetSetsController } from "./get-sets.controller";
import { BricksetRepository } from "./brickset.repository";
import {
  SecretsManagerBricksetCredentialsProvider,
} from "./brickset-secret.provider";
import { SearchSetsService } from "./search-sets.service";
import type { ErrorCode } from "./set.types";

export interface GetSetsRouteDependencies {
  controller: GetSetsController;
  logError?: (context: { event: string; code: ErrorCode; requestId?: string }) => void;
}

export function createGetSetsRoute(): GetSetsRouteDependencies {
  const credentialsProvider = new SecretsManagerBricksetCredentialsProvider();
  const catalog = new BricksetRepository(credentialsProvider, new BricksetClient());
  return { controller: new GetSetsController(new SearchSetsService(catalog)) };
}

export async function getSetsRoute(
  event: APIGatewayProxyEventV2,
  dependencies: GetSetsRouteDependencies = createGetSetsRoute(),
): Promise<APIGatewayProxyStructuredResultV2> {
  const response = await dependencies.controller.handle(event.queryStringParameters);
  if ((response.statusCode ?? 500) >= 500) {
    (dependencies.logError ?? safeLogError)({
      event: "brickset_search_failed",
      code: "UPSTREAM_UNAVAILABLE",
      requestId: event.requestContext.requestId,
    });
  }
  return response;
}
