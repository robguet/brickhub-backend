import { readFileSync } from "node:fs";
import { expect,it } from "vitest";
const contract=readFileSync("specs/009-shopping-product-details/contracts/openapi.yaml","utf8");
it("describes private endpoint and every store attribute",()=>{expect(contract).toContain("/v1/shopping/product:");expect(contract).toContain("scheme: bearer");for(const key of ["catalog_id","shipping_extracted","more_options","details_and_offers"])expect(contract).toContain(key);});
it("declares dedicated minimal SAM resources",()=>{const template=readFileSync("template.yaml","utf8");const fn=template.split("  GetShoppingProductFunction:\n")[1]?.split("  GetShoppingProductFunctionLogGroup:")[0]??"";for(const text of ["Path: /v1/shopping/product","Authorizer: CognitoJwtAuthorizer","SecretArn: !Ref ScrapeDoSecretArn","Timeout: 29","MemorySize: 256"])expect(fn).toContain(text);expect(fn).not.toContain("dynamodb:");expect(template).toContain("ShoppingProductUrl:");});

import { createRequire } from "node:module";
import { productSample } from "../fixtures/shopping/product-helpers";
const requireDependency=createRequire(process.cwd()+"/package.json");
// Transitive tooling dependencies are used only for local contract validation, with explicit boundaries.
const yaml=requireDependency("js-yaml") as {load(value:string):unknown};
const Ajv=requireDependency("ajv") as new(options:Record<string,unknown>)=>{compile(value:unknown):(data:unknown)=>boolean};
it("validates payloads and references against actual OpenAPI schemas",()=>{
 const api=yaml.load(contract) as {components:{schemas:Record<string,unknown>}};
 const normalized=structuredClone(api);
 function adapt(value:unknown):void {if(value===null||typeof value!=="object")return;const node=value as Record<string,unknown>;if(node.nullable&&typeof node.type==="string")node.type=[node.type,"null"];delete node.nullable;if(node.format==="uri")delete node.format;for(const child of Object.values(node))adapt(child);}
 function references(value:unknown):void{if(value===null||typeof value!=="object")return;const node=value as Record<string,unknown>;if(typeof node.$ref==="string")expect(api.components.schemas[node.$ref.split("/").at(-1)??""]).toBeDefined();for(const child of Object.values(node))references(child);}
 references(api);adapt(normalized);
 const validate=new Ajv({allErrors:true,strict:false}).compile({$ref:"#/components/schemas/ShoppingProductSuccessResponse",components:normalized.components});
 expect(validate({status:"success",data:productSample()})).toBe(true);
 expect(validate({status:"success",data:{product_results:{title:"x",stores:[]},search_parameters:null}})).toBe(true);
 expect(validate({status:"success",data:{product_results:{title:"x",stores:[{position:1,name:"shop",price:null}]}}})).toBe(true);
 expect(validate({status:"success",data:{product_results:{title:"x"}}})).toBe(false);
 expect(validate({status:"success",data:{product_results:{title:"x",stores:[],product_id:123}}})).toBe(false);
});
it("restricts IAM and observability with platform401 exception",()=>{const template=readFileSync("template.yaml","utf8");const block=template.split("  GetShoppingProductFunctionLogGroup:\n")[1]?.split("  CollectionSetsFunction:")[0]??"";expect(block).toContain("RetentionInDays: 14");expect(contract).toContain("GatewayUnauthorized");expect(contract).toContain("oneOf:");const fn=template.split("  GetShoppingProductFunction:\n")[1]?.split("  GetShoppingProductFunctionLogGroup:")[0]??"";expect(fn).not.toContain("Resource: '*'");expect(fn).not.toContain("FunctionUrlConfig");expect(fn).toContain("SCRAPE_DO_SECRET_ARN: !Ref ScrapeDoSecretArn");});
