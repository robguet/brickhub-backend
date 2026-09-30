import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";

import { authenticatedUserFromEvent } from "../../shared/authenticated-user";
import { collectionErrorResponse } from "../../shared/http-response";
import { DynamoDbProfileRepository } from "./dynamodb-profile.repository";
import { ProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";

function controller(): ProfileController { return new ProfileController(new ProfileService(new DynamoDbProfileRepository())); }
function parseBody(event: APIGatewayProxyEventV2): unknown { try { return event.body === undefined ? undefined : JSON.parse(event.body); } catch { return undefined; } }

export async function profileRoute(event: APIGatewayProxyEventV2, instance = controller()): Promise<APIGatewayProxyStructuredResultV2> {
  const user = authenticatedUserFromEvent(event);
  if (user === undefined) return collectionErrorResponse(401, "UNAUTHENTICATED", "La autenticación es requerida.");
  if (event.requestContext.http.method === "GET") return instance.get(user);
  if (event.requestContext.http.method === "PUT") return instance.initialize(user, parseBody(event));
  return collectionErrorResponse(404, "RESOURCE_NOT_FOUND", "La ruta no existe.");
}
