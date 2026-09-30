import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";

import { authenticatedUserFromEvent } from "../../shared/authenticated-user";
import { collectionErrorResponse } from "../../shared/http-response";
import { DynamoDbCollectionSetRepository } from "./dynamodb-collection-set.repository";
import { CollectionSetsController } from "./collection-sets.controller";
import { CollectionSetsService } from "./collection-sets.service";

function controller(): CollectionSetsController { return new CollectionSetsController(new CollectionSetsService(new DynamoDbCollectionSetRepository())); }
function parseBody(event: APIGatewayProxyEventV2): unknown { try { return event.body === undefined ? undefined : JSON.parse(event.body); } catch { return undefined; } }

export async function collectionSetsRoute(event: APIGatewayProxyEventV2, instance = controller()): Promise<APIGatewayProxyStructuredResultV2> {
  const user = authenticatedUserFromEvent(event);
  if (user === undefined) return collectionErrorResponse(401, "UNAUTHENTICATED", "La autenticación es requerida.");
  if (event.requestContext.http.method === "GET") return instance.list(user, event.queryStringParameters);
  if (event.requestContext.http.method === "POST") return instance.create(user, parseBody(event));
  const id = event.pathParameters?.collectionSetId;
  if (event.requestContext.http.method === "PATCH") return instance.update(user, id, parseBody(event));
  if (event.requestContext.http.method === "DELETE") return instance.delete(user, id);
  return collectionErrorResponse(404, "RESOURCE_NOT_FOUND", "La ruta no existe.");
}
