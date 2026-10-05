import { expect, it } from "vitest";
import { contentSchema, purchaseLinksSchema, publicReleaseSchema } from "../../../../src/modules/radar/radar.schemas";
import { post } from "../../../fixtures/radar/helpers";
it("preserves multiple purchase links on article details and rejects unsafe URLs", () => {
 const purchaseLinks = [{ store: "Amazon", link: "https://www.amazon.com/s?k=lego+darth+vader" }, { store: "Mercado Libre", link: "https://listado.mercadolibre.com.mx/lego-darth-vader" }];
 expect(contentSchema.parse({ ...post().detail, purchaseLinks }).purchaseLinks).toEqual(purchaseLinks);
 expect(purchaseLinksSchema.safeParse([{ store: "Amazon", link: "javascript:alert(1)" }]).success).toBe(false);
 expect(purchaseLinksSchema.safeParse([{ sotore: "Amazon", link: "https://www.amazon.com" }]).success).toBe(false);
 expect(contentSchema.parse(post().detail).purchaseLinks).toEqual([]);
});
it("projects purchase links on releases without exposing the legacy amazonLink", () => {
 const purchaseLinks=[{store:"Amazon",link:"https://www.amazon.com"}];
 const release={id:"sample",setNumber:"75383",name:"Set",image:{url:"https://example.com/a.png",alt:"Set"},market:"MX",releaseDate:"2026-07-22",price:1,currency:"MXN",status:"available",url:"/explore/75383",editorialStatus:"published",sourceIds:[],schemaVersion:1,version:1,updatedAt:"2026-10-05T12:00:00.000Z",sourceHash:"a".repeat(64),sourceReference:"fixture",purchaseLinks,amazonLink:"https://www.amazon.com"};
 expect(publicReleaseSchema.parse(release).purchaseLinks).toEqual(purchaseLinks);
 expect(publicReleaseSchema.parse(release)).not.toHaveProperty("amazonLink");
});
