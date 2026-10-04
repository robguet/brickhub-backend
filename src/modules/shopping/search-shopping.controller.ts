import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import type { SearchShoppingService } from "./search-shopping.service";
import { shoppingErrorResponse, shoppingSuccessResponse } from "./shopping-response";
import { shoppingQuerySchema } from "./shopping.schemas";
import { boundedOperation } from "./shopping-deadline";
import { ShoppingError } from "./shopping.types";

const QUERY_PARAMETERS = new Set(["q", "hl", "gl", "google_domain", "location"]);
export class SearchShoppingController {
  public constructor(private readonly createService: () => SearchShoppingService) {}
  public async handle(rawQuery: string): Promise<APIGatewayProxyStructuredResultV2> {
    const params = new URLSearchParams(rawQuery);
    const values: Record<string, string> = {};
    for (const [key, value] of params) {
      if (!QUERY_PARAMETERS.has(key) || Object.hasOwn(values, key)) {
        return shoppingErrorResponse(new ShoppingError("VALIDATION_ERROR", 400));
      }
      values[key] = value;
    }
    const parsed = shoppingQuerySchema.safeParse(values);
    if (!parsed.success) return shoppingErrorResponse(new ShoppingError("VALIDATION_ERROR", 400));
    try {
      const expiresAt = Date.now() + 27_000;
      const data = await boundedOperation(
        new AbortController().signal,
        27_000,
        signal => this.createService().search(parsed.data, { signal, expiresAt }),
        new ShoppingError("UPSTREAM_UNAVAILABLE", 502),
      );
      return shoppingSuccessResponse(data);
    } catch (error: unknown) {
      return shoppingErrorResponse(error instanceof ShoppingError ? error : new ShoppingError("INTERNAL_ERROR", 500));
    }
  }
}
