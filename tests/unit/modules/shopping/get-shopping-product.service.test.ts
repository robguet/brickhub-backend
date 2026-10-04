import { expect,it,vi } from "vitest";
import { GetShoppingProductService } from "../../../../src/modules/shopping/get-shopping-product.service";
import { productSample,productQuery,deadline } from "../../../fixtures/shopping/product-helpers";
it("forwards one query and deadline without search/alternative calls",async()=>{const getProduct=vi.fn().mockResolvedValue(productSample());const d=deadline();expect(await new GetShoppingProductService({getProduct}).getProduct(productQuery,d)).toEqual(productSample());expect(getProduct).toHaveBeenCalledExactlyOnceWith(productQuery,d);});
