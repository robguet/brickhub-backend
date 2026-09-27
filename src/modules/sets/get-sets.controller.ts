import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { z } from "zod";

import { errorResponse, successResponse } from "../../shared/http-response";
import { SearchError } from "./set.types";
import type { SearchSetsService } from "./search-sets.service";

const searchQuerySchema = z.object({
  query: z.string().trim().min(1).max(100),
  pageNumber: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(20),
});

export class GetSetsController {
  public constructor(private readonly searchSetsService: SearchSetsService) {}

  public async handle(
    queryStringParameters: Record<string, string | undefined> | undefined,
  ): Promise<APIGatewayProxyStructuredResultV2> {
    const parsedQuery = searchQuerySchema.safeParse(queryStringParameters ?? {});
    if (!parsedQuery.success) {
      return errorResponse(400, "VALIDATION_ERROR", "La consulta de búsqueda no es válida.");
    }

    try {
      return successResponse(await this.searchSetsService.search(parsedQuery.data));
    } catch (error: unknown) {
      if (error instanceof SearchError) {
        return errorResponse(error.statusCode, error.code, error.message);
      }
      return errorResponse(502, "UPSTREAM_UNAVAILABLE", "El catálogo no está disponible en este momento.");
    }
  }
}
