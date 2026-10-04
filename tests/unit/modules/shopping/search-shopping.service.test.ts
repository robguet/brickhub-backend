import { expect, it, vi } from "vitest";
import { SearchShoppingService } from "../../../../src/modules/shopping/search-shopping.service";
import { deadline,query,sample } from "../../../fixtures/shopping/helpers";
it("delegates exact query and deadline without exposing credentials or altering offers",async()=>{
 const data=sample();const search=vi.fn().mockResolvedValue(data);const time=deadline();
 expect(await new SearchShoppingService({search}).search(query,time)).toEqual(data);
 expect(search).toHaveBeenCalledExactlyOnceWith(query,time);
});
