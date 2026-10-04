import { describe, expect, it } from "vitest";
import { shoppingResultSchema, shoppingQuerySchema } from "../../../../src/modules/shopping/shopping.schemas";
import { sample } from "../../../fixtures/shopping/helpers";
describe("shopping DTO boundary", () => {
  it("preserves 40 offers, categories, metadata and long IDs", () => {
    const data = shoppingResultSchema.parse(sample());
    expect(data).toEqual(sample());
    expect(data.shopping_results).toHaveLength(40);
  });
  it("strips unknown nested fields and preserves absent and null optional fields", () => {
    const input = {shopping_results:[{position:1,title:"LEGO",product_id:null,thumbnail:null,token:"never"}],search_information:null,token:"never"};
    expect(shoppingResultSchema.parse(input)).toEqual({shopping_results:[{position:1,title:"LEGO",product_id:null,thumbnail:null}],search_information:null});
  });
  it.each([{position:0,title:"x"},{position:1,title:""},{position:1,title:"x",product_id:Number("6789801949246787910")},{position:1,title:"x",rating:6},{position:1,title:"x",reviews:-1},{position:1,title:"x",extracted_price:-1},{position:1,title:"x",thumbnail:"javascript:alert(1)"}])("rejects incompatible offer %j", product => {
    expect(shoppingResultSchema.safeParse({shopping_results:[product]}).success).toBe(false);
  });
  it("accepts empty valid results", () => expect(shoppingResultSchema.parse({shopping_results:[]})).toEqual({shopping_results:[]}));
  it("applies Mexican defaults and trims q", () => expect(shoppingQuerySchema.parse({q:" LEGO 75394 "})).toEqual({q:"LEGO 75394",hl:"es-mx",gl:"mx",google_domain:"google.com.mx",location:"Mexico"}));
});

describe("market input constraints",()=>{
 it.each([{hl:"english"},{hl:"en_US"},{gl:"USA"},{google_domain:"https://google.com"},{google_domain:"google.com:443"},{google_domain:"google.com.evil"},{google_domain:"google.com/path"},{location:"x\u0000y"},{location:"x\u0085y"},{location:"x".repeat(201)}])("rejects malformed market %j",market=>expect(shoppingQuerySchema.safeParse({q:"LEGO",...market}).success).toBe(false));
 it.each(["hl","gl","google_domain","location"])("rejects explicit empty %s",field=>expect(shoppingQuerySchema.safeParse({q:"LEGO",[field]:"  "}).success).toBe(false));
 it("preserves a complete explicit market including casing and trims spaces",()=>{
  expect(shoppingQuerySchema.parse({q:" x ",hl:" EN-us ",gl:" US ",google_domain:" GOOGLE.COM ",location:" United States "})).toEqual({q:"x",hl:"EN-us",gl:"US",google_domain:"GOOGLE.COM",location:"United States"});
 });
 it("defaults only omitted fields and accepts boundary lengths",()=>{
  const value=shoppingQuerySchema.parse({q:"x".repeat(200),gl:"us",location:"x".repeat(200)});
  expect(value.hl).toBe("es-mx");expect(value.gl).toBe("us");expect(value.location).toHaveLength(200);
 });
});
