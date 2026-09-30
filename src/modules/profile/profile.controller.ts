import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";

import type { AuthenticatedUser } from "../../shared/authenticated-user";
import { collectionErrorResponse, profileSuccessResponse } from "../../shared/http-response";
import { initializeProfileSchema } from "./profile.schemas";
import type { ProfileService } from "./profile.service";

export class ProfileController {
  public constructor(private readonly service: ProfileService) {}

  public async get(user: AuthenticatedUser): Promise<APIGatewayProxyStructuredResultV2> {
    try {
      const profile = await this.service.get(user);
      return profile === undefined
        ? collectionErrorResponse(404, "PROFILE_NOT_FOUND", "El perfil aún no ha sido inicializado.")
        : profileSuccessResponse({ profile });
    } catch {
      return collectionErrorResponse(500, "INTERNAL_ERROR", "No fue posible consultar el perfil.");
    }
  }

  public async initialize(user: AuthenticatedUser, body: unknown): Promise<APIGatewayProxyStructuredResultV2> {
    const parsed = initializeProfileSchema.safeParse(body);
    if (!parsed.success) return collectionErrorResponse(400, "VALIDATION_ERROR", "El perfil no es válido.");
    try { return profileSuccessResponse(await this.service.initialize(user, parsed.data)); }
    catch { return collectionErrorResponse(500, "INTERNAL_ERROR", "No fue posible inicializar el perfil."); }
  }
}
