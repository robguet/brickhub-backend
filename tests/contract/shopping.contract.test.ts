import { readFileSync } from "node:fs";
import { describe,expect,it } from "vitest";
const contract=readFileSync("specs/008-google-shopping-search/contracts/openapi.yaml","utf8");
const template=readFileSync("template.yaml","utf8");
describe("shopping public contract and SAM boundary",()=>{
 it("documents a versioned private operation and optional market parameters",()=>{
  expect(contract).toContain("/v1/shopping/search:");expect(contract).toContain("scheme: bearer");
  for(const name of ["q","hl","gl","google_domain","location"])expect(contract).toContain("name: "+name);
  for(const status of ["200","400","401","429","500","502"])expect(contract).toContain("'"+status+"':");
  expect(contract).toContain("nullable: true");expect(contract).not.toContain("SCRAPE_DO_API_KEY:");
 });
 it("binds a dedicated least privilege function to Cognito",()=>{
  const fn=template.split("  SearchShoppingFunction:\n")[1]?.split("  SearchShoppingFunctionLogGroup:")[0]??"";
  expect(fn).toContain("Path: /v1/shopping/search");expect(fn).toContain("Authorizer: CognitoJwtAuthorizer");
  expect(fn).toContain("SecretArn: !Ref ScrapeDoSecretArn");expect(fn).toContain("Timeout: 29");expect(fn).toContain("MemorySize: 256");
  expect(fn).not.toContain("dynamodb:");expect(template).toContain("SearchShoppingFunctionLogGroup:");expect(template).toContain("SearchShoppingUrl:");
 });
});
it("retains JWT validation in Gateway without adding scopes or direct function URLs",()=>{
 const fn=template.split("  SearchShoppingFunction:\n")[1]?.split("  SearchShoppingFunctionLogGroup:")[0]??"";
 expect(fn).not.toContain("AuthorizationScopes");expect(fn).not.toContain("FunctionUrlConfig");
 expect(contract).toContain("GatewayUnauthorized:");expect(contract).toContain("oneOf:");
 expect(contract).toContain("bearerFormat: JWT");
});
it("keeps log retention explicit and emits no secret value configuration",()=>{
 const group=template.split("  SearchShoppingFunctionLogGroup:\n")[1]?.split("  CollectionSetsFunction:")[0]??"";
 expect(group).toContain("RetentionInDays: 14");expect(template).toContain("SCRAPE_DO_SECRET_ARN: !Ref ScrapeDoSecretArn");
 expect(template).not.toContain("SCRAPE_DO_API_KEY:");
});
