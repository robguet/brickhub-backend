import { expect, it } from "vitest";
import { contentSchema, videoLinksSchema } from "../../../../src/modules/radar/radar.schemas";
import { post } from "../../../fixtures/radar/helpers";
import { request } from "../../../fixtures/radar/http";
const links = [{ platform: "tiktok" as const, link: "https://www.tiktok.com/@brickhub/video/123" }, { platform: "instagram-reels" as const, link: "https://www.instagram.com/reel/ABC/" }];
it("preserves both platforms and rejects unsafe links and unknown platforms", () => {
 expect(contentSchema.parse({ ...post().detail, videoLinks: links }).videoLinks).toEqual(links);
 expect(videoLinksSchema.parse(undefined)).toEqual([]);
 expect(videoLinksSchema.safeParse([{platform:"youtube",link:"https://example.com"}]).success).toBe(false);
 expect(videoLinksSchema.safeParse([{platform:"tiktok",link:"javascript:alert(1)"}]).success).toBe(false);
});
it("returns videoLinks in the existing detail endpoint", async () => {
 const value=post();value.detail.videoLinks=links;
 const result=await request("/v1/radar/posts/sample","",{getPost:async()=>value});
 expect(result.statusCode).toBe(200);expect(JSON.parse(result.body!).data.post.videoLinks).toEqual(links);
});
