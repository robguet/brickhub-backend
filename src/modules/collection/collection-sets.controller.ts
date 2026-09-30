import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";

import type { AuthenticatedUser } from "../../shared/authenticated-user";
import { collectionErrorResponse, collectionSuccessResponse } from "../../shared/http-response";
import { collectionSetIdSchema, createCollectionSetSchema, listCollectionSetSchema, updateCollectionSetSchema } from "./collection-set.schemas";
import type { CollectionSetsService } from "./collection-sets.service";

export class CollectionSetsController {
  public constructor(private readonly service: CollectionSetsService) {}

  public async list(user: AuthenticatedUser, query: Record<string, string | undefined> | undefined): Promise<APIGatewayProxyStructuredResultV2> {
    const parsed = listCollectionSetSchema.safeParse(query ?? {});
    if (!parsed.success) return collectionErrorResponse(400, "VALIDATION_ERROR", "La consulta de colección no es válida.");
    try { return collectionSuccessResponse(200, await this.service.list(user, parsed.data.limit, parsed.data.cursor)); }
    catch (error: unknown) { return error instanceof Error && error.message === "INVALID_CURSOR" ? collectionErrorResponse(400, "VALIDATION_ERROR", "El cursor no es válido.") : collectionErrorResponse(500, "INTERNAL_ERROR", "No fue posible consultar la colección."); }
  }

  public async create(user: AuthenticatedUser, body: unknown): Promise<APIGatewayProxyStructuredResultV2> {
    const parsed = createCollectionSetSchema.safeParse(body);
    if (!parsed.success) return collectionErrorResponse(400, "VALIDATION_ERROR", "El set no es válido.");
    try { return collectionSuccessResponse(201, { set: await this.service.create(user, parsed.data) }); }
    catch (error: unknown) { return error instanceof Error && error.message === "COLLECTION_CONFLICT" ? collectionErrorResponse(409, "CONFLICT", "No fue posible crear el set.") : collectionErrorResponse(500, "INTERNAL_ERROR", "No fue posible crear el set."); }
  }

  public async update(user: AuthenticatedUser, id: string | undefined, body: unknown): Promise<APIGatewayProxyStructuredResultV2> {
    const validId = collectionSetIdSchema.safeParse(id);
    const validBody = updateCollectionSetSchema.safeParse(body);
    if (!validId.success || !validBody.success) return collectionErrorResponse(400, "VALIDATION_ERROR", "La actualización no es válida.");
    try { const set = await this.service.update(user, validId.data, validBody.data); return set === undefined ? collectionErrorResponse(404, "RESOURCE_NOT_FOUND", "El set no existe.") : collectionSuccessResponse(200, { set }); }
    catch { return collectionErrorResponse(500, "INTERNAL_ERROR", "No fue posible actualizar el set."); }
  }

  public async delete(user: AuthenticatedUser, id: string | undefined): Promise<APIGatewayProxyStructuredResultV2> {
    const validId = collectionSetIdSchema.safeParse(id);
    if (!validId.success) return collectionErrorResponse(400, "VALIDATION_ERROR", "El identificador no es válido.");
    try { return await this.service.delete(user, validId.data) ? collectionSuccessResponse(200, { collectionSetId: validId.data, deleted: true }) : collectionErrorResponse(404, "RESOURCE_NOT_FOUND", "El set no existe."); }
    catch { return collectionErrorResponse(500, "INTERNAL_ERROR", "No fue posible eliminar el set."); }
  }
}
