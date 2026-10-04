import { describe,expect,it,vi } from "vitest";
import { SecretsManagerScrapeDoCredentialsProvider } from "../../../../src/modules/shopping/scrapedo-secret.provider";
import { deadline } from "../../../fixtures/shopping/helpers";
describe("ScrapeDo secret provider",()=>{
 it("reads the configured ARN and caches only credentials for 300 seconds",async()=>{
  const send=vi.fn().mockResolvedValue({SecretString:JSON.stringify({SCRAPE_DO_API_KEY:"fake-provider-key"})});let now=1000;
  const provider=new SecretsManagerScrapeDoCredentialsProvider("test-secret-arn",{send},()=>now);
  expect(await provider.getCredentials(deadline())).toEqual({apiKey:"fake-provider-key"});
  expect(send.mock.calls[0]?.[0].input).toEqual({SecretId:"test-secret-arn"});
  now+=299_000;await provider.getCredentials(deadline());expect(send).toHaveBeenCalledTimes(1);
  now+=1000;await provider.getCredentials(deadline());expect(send).toHaveBeenCalledTimes(2);
 });
});
it.each([undefined,"not-json","{}",'{"SCRAPE_DO_API_KEY":" "}'])("rejects unusable secrets without caching failures",async SecretString=>{
 const send=vi.fn().mockResolvedValue({SecretString});const provider=new SecretsManagerScrapeDoCredentialsProvider("test-arn",{send});
 await expect(provider.getCredentials(deadline())).rejects.toMatchObject({code:"INTERNAL_ERROR",statusCode:500});
 await expect(provider.getCredentials(deadline())).rejects.toMatchObject({code:"INTERNAL_ERROR"});expect(send).toHaveBeenCalledTimes(2);
});
it("does not invoke SDK without configuration",async()=>{
 const send=vi.fn();await expect(new SecretsManagerScrapeDoCredentialsProvider("",{send}).getCredentials(deadline())).rejects.toMatchObject({code:"INTERNAL_ERROR"});expect(send).not.toHaveBeenCalled();
});
it("sanitizes SDK errors",async()=>{
 const send=vi.fn().mockRejectedValue(new Error("secret-value and internal ARN"));
 await expect(new SecretsManagerScrapeDoCredentialsProvider("test-arn",{send}).getCredentials(deadline())).rejects.toMatchObject({message:"La búsqueda no está disponible en este momento."});
});
it("aborts secret reads after two seconds with only one attempt",async()=>{
 vi.useFakeTimers();
 try{
  let signal:AbortSignal|undefined;
  const send=vi.fn().mockImplementation((_command,options:{abortSignal:AbortSignal})=>{signal=options.abortSignal;return new Promise(()=>{});});
  const pending=new SecretsManagerScrapeDoCredentialsProvider("test-arn",{send}).getCredentials(deadline());
  const assertion=expect(pending).rejects.toMatchObject({code:"INTERNAL_ERROR"});
  await vi.advanceTimersByTimeAsync(2000);await assertion;expect(signal?.aborted).toBe(true);expect(send).toHaveBeenCalledTimes(1);
 }finally{vi.useRealTimers();}
});
it("does not read or return cached credentials after cancellation",async()=>{
 const send=vi.fn().mockResolvedValue({SecretString:'{"SCRAPE_DO_API_KEY":"fake-key"}'});
 const provider=new SecretsManagerScrapeDoCredentialsProvider("test-arn",{send});await provider.getCredentials(deadline());
 const cancelled=deadline();const controller=new AbortController();controller.abort();
 await expect(provider.getCredentials({...cancelled,signal:controller.signal})).rejects.toMatchObject({code:"INTERNAL_ERROR"});expect(send).toHaveBeenCalledTimes(1);
});
it("does not cache late SDK results after a timeout",async()=>{
 vi.useFakeTimers();
 try{
  let resolveRead:((value:{SecretString:string})=>void)|undefined;
  const send=vi.fn().mockImplementationOnce(()=>new Promise<{SecretString:string}>(resolve=>{resolveRead=resolve;})).mockResolvedValue({SecretString:'{"SCRAPE_DO_API_KEY":"fresh-key"}'});
  const provider=new SecretsManagerScrapeDoCredentialsProvider("test-arn",{send});const pending=provider.getCredentials(deadline());const assertion=expect(pending).rejects.toMatchObject({code:"INTERNAL_ERROR"});
  await vi.advanceTimersByTimeAsync(2000);await assertion;resolveRead?.({SecretString:'{"SCRAPE_DO_API_KEY":"late-key"}'});await Promise.resolve();
  expect(await provider.getCredentials(deadline())).toEqual({apiKey:"fresh-key"});expect(send).toHaveBeenCalledTimes(2);
 }finally{vi.useRealTimers();}
});
