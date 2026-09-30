import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";

import { authenticatedUserFromEvent } from "../../shared/authenticated-user";
import { collectionErrorResponse } from "../../shared/http-response";
import { DynamoDbSavedSetRepository } from "./dynamodb-saved-set.repository";
import { SavedSetsController } from "./saved-sets.controller";
import { SavedSetsService } from "./saved-sets.service";

function controller(): SavedSetsController { return new SavedSetsController(new SavedSetsService(new DynamoDbSavedSetRepository())); }
function parseBody(event: APIGatewayProxyEventV2): unknown { try { return event.body === undefined ? undefined : JSON.parse(event.body); } catch { return undefined; } }

export async function savedSetsRoute(event: APIGatewayProxyEventV2, instance = controller()): Promise<APIGatewayProxyStructuredResultV2> {
  const user = authenticatedUserFromEvent(event);
  if (user === undefined) return collectionErrorResponse(401, "UNAUTHENTICATED", "La autenticación es requerida.");
  if (event.requestContext.http.method === "GET") return instance.list(user);
  if (event.requestContext.http.method === "POST") return instance.save(user, parseBody(event));
  return collectionErrorResponse(404, "RESOURCE_NOT_FOUND", "La ruta no existe.");
}
