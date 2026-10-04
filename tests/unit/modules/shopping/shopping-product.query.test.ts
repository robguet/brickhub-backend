import { expect,it } from "vitest";
import { shoppingProductQuerySchema as schema } from "../../../../src/modules/shopping/shopping-product.schemas";
import { productQuery } from "../../../fixtures/shopping/product-helpers";
it("defaults every omitted market and preserves long/leading-zero catalogue",()=>{expect(schema.parse({catalog_id:" 0006789801949246787910 ",q:" LEGO 75394 "})).toEqual({...productQuery,catalog_id:"0006789801949246787910"});expect(schema.parse({catalog_id:"1",q:"x",gl:"us"})).toMatchObject({gl:"us",hl:"es-mx",location:"Mexico"});});
it.each(["","0","000","-1","1.2","12 3","x","1".repeat(101)])("rejects invalid catalogue %s",catalog_id=>expect(schema.safeParse({catalog_id,q:"x"}).success).toBe(false));
it.each([{q:""},{q:"x".repeat(201)},{hl:"english"},{gl:"usa"},{google_domain:"https://google.com"},{location:"a\u0000b"},{token:"client-secret"}])("rejects invalid market/query %j",value=>expect(schema.safeParse({...productQuery,...value}).success).toBe(false));
it("accepts documented syntax boundaries",()=>{expect(schema.safeParse({...productQuery,catalog_id:"1".repeat(100),q:"x".repeat(200),hl:"ESP-MX",gl:"US",google_domain:"GOOGLE.CO.UK",location:"x".repeat(200)}).success).toBe(true);});
