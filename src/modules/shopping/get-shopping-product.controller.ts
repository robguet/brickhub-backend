import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import type { GetShoppingProductService } from "./get-shopping-product.service";
import { shoppingErrorResponse, shoppingSuccessResponse } from "./shopping-response";
import { shoppingProductQuerySchema } from "./shopping-product.schemas";
import { boundedOperation } from "./shopping-deadline";
import { ShoppingError } from "./shopping.types";

const QUERY_PARAMETERS = new Set(["catalog_id", "q", "hl", "gl", "google_domain", "location"]);
export class GetShoppingProductController {
  public constructor(private readonly createService: () => GetShoppingProductService) {}
  public async handle(rawQuery: string): Promise<APIGatewayProxyStructuredResultV2> {
    const params = new URLSearchParams(rawQuery);
    const values: Record<string, string> = {};
    for (const [key, value] of params) {
      if (!QUERY_PARAMETERS.has(key) || Object.hasOwn(values, key)) {
        return shoppingErrorResponse(new ShoppingError("VALIDATION_ERROR", 400));
      }
      values[key] = value;
    }
    const parsed = shoppingProductQuerySchema.safeParse(values);
    if (!parsed.success) return shoppingErrorResponse(new ShoppingError("VALIDATION_ERROR", 400));
    try {
      const expiresAt = Date.now() + 27_000;
      const data = await boundedOperation(
        new AbortController().signal,
        27_000,
        signal => this.createService().getProduct(parsed.data, { signal, expiresAt }),
        new ShoppingError("UPSTREAM_UNAVAILABLE", 502),
      );
      return shoppingSuccessResponse(data);
    } catch (error: unknown) {
      return shoppingErrorResponse(error instanceof ShoppingError ? error : new ShoppingError("INTERNAL_ERROR", 500));
    }
  }
}
