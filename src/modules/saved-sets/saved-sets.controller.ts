import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";

import type { AuthenticatedUser } from "../../shared/authenticated-user";
import { collectionErrorResponse, collectionSuccessResponse } from "../../shared/http-response";
import { saveUserSetSchema } from "./saved-set.schemas";
import type { SavedSetsService } from "./saved-sets.service";

export class SavedSetsController {
  public constructor(private readonly service: SavedSetsService) {}

  public async list(user: AuthenticatedUser): Promise<APIGatewayProxyStructuredResultV2> {
    try {
      return collectionSuccessResponse(200, await this.service.list(user));
    } catch {
      return collectionErrorResponse(500, "INTERNAL_ERROR", "No fue posible consultar los sets guardados.");
    }
  }

  public async save(user: AuthenticatedUser, body: unknown): Promise<APIGatewayProxyStructuredResultV2> {
    const parsed = saveUserSetSchema.safeParse(body);
    if (!parsed.success) {
      const invalidDestination = parsed.error.issues.some((issue) => issue.path[0] === "destination");
      return collectionErrorResponse(400, "VALIDATION_ERROR", invalidDestination
        ? "El destino debe ser 'collection' o 'wishlist'."
        : "El set no es válido.");
    }
    try {
      const result = await this.service.save(user, parsed.data);
      return collectionSuccessResponse(result.created ? 201 : 200, { savedSet: { ...result.savedSet, created: result.created } });
    } catch {
      return collectionErrorResponse(500, "INTERNAL_ERROR", "No fue posible guardar el set.");
    }
  }
}
