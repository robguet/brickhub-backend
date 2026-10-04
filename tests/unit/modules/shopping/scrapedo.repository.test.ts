import { expect,it,vi } from "vitest";
import { ScrapeDoRepository } from "../../../../src/modules/shopping/scrapedo.repository";
import { deadline,query,sample } from "../../../fixtures/shopping/helpers";
it("reads credentials and invokes only the initial page once",async()=>{
 const credentials={apiKey:"fake-provider-key"};const getCredentials=vi.fn().mockResolvedValue(credentials);const data=sample();const search=vi.fn().mockResolvedValue(data);const time=deadline();
 expect(await new ScrapeDoRepository({getCredentials},{search}).search(query,time)).toEqual(data);
 expect(getCredentials).toHaveBeenCalledExactlyOnceWith(time);expect(search).toHaveBeenCalledExactlyOnceWith(credentials,query,time);
});
