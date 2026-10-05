import { z } from "zod";

export const radarId = z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/);
export const radarSlug = z.string().max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const text = z.string().trim().min(1).max(20_000);
export const httpsUrl = z.string().max(2048).url().refine(value => {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; }
  catch { return false; }
});
export const civilDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
});
export const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export const instant = z.iso.datetime({ offset: true });
export const publishedDate = z.union([civilDate, instant]);
export function publicationSort(value: string): string {
  publishedDate.parse(value);
  return new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value).toISOString();
}
export const category = z.enum(["rumor", "lanzamiento", "resena", "top"]);
export const articleType = z.enum(["rumor", "release", "review", "ranking", "opinion", "guide"]);
export const editorialStatus = z.enum(["draft", "published", "withdrawn"]);
export const commercialStatus = z.enum(["upcoming", "preorder", "available", "delayed", "cancelled"]);
export const currency = z.string().regex(/^[A-Z]{3}$/);
const money = z.number().finite().nonnegative();
const score = z.number().finite().min(0).max(10);
export const purchaseLinkSchema = z.strictObject({ store: z.string().trim().min(1).max(100), link: httpsUrl });
export const purchaseLinksSchema = z.array(purchaseLinkSchema).max(20).default([]);
export const videoLinkSchema = z.strictObject({ platform: z.enum(["tiktok", "instagram-reels"]), link: httpsUrl });
export const videoLinksSchema = z.array(videoLinkSchema).max(20).default([]);
export const imageSchema = z.strictObject({ url: httpsUrl, alt: text });
export const rumorStatusFields = {
  status: z.enum(["unconfirmed", "partially-confirmed", "confirmed", "debunked"]),
  confidence: z.enum(["low", "medium", "high"]),
  sourceName: text,
  sourceUrl: httpsUrl.optional(),
  lastUpdatedAt: publishedDate,
  message: text,
};
export const rumorStatusSchema = z.strictObject(rumorStatusFields);
export const setSchema = z.strictObject({
  number: z.string().regex(/^\d{1,12}$/), name: text, theme: text.optional(),
  pieces: z.number().int().positive().optional(), age: text.optional(),
  releaseDate: civilDate.optional(), msrp: money.optional(), currency: currency.optional(), image: httpsUrl.optional(),
});
const rankedSet = z.strictObject({
  position: z.number().int().positive(), setNumber: z.string().regex(/^\d{1,12}$/),
  name: text, image: httpsUrl, description: text, score: score.optional(),
});
export const blockSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("paragraph"), text }),
  z.strictObject({ type: z.literal("heading"), level: z.number().int().min(2).max(6), text }),
  z.strictObject({ type: z.literal("callout"), tone: z.enum(["info", "warning", "success"]), title: text, text }),
  z.strictObject({ type: z.literal("prosCons"), title: text.optional(), pros: z.array(text), cons: z.array(text) }),
  z.strictObject({ type: z.literal("rating"), score: z.number().finite().nonnegative(), maxScore: z.number().finite().positive(), label: text, summary: text }).refine(value => value.score <= value.maxScore),
  z.strictObject({ type: z.literal("rumorStatus"), ...rumorStatusFields }),
  z.strictObject({ type: z.literal("releaseInfo"), status: commercialStatus, releaseDate: civilDate, price: money, currency, availability: z.array(text) }),
  z.strictObject({ type: z.literal("setRanking"), title: text, items: z.array(rankedSet).min(1).refine(items => items.every((item, i) => i === 0 || item.position > items[i - 1]!.position)) }),
  z.strictObject({ type: z.literal("setCard"), number: z.string().regex(/^\d{1,12}$/), name: text, image: httpsUrl, description: text }),
]);
export const versionFields = { schemaVersion: z.literal(1), version: z.number().int().positive(), updatedAt: instant };
export const sourceFields = { sourceHash: z.string().regex(/^[a-f0-9]{64}$/), sourceReference: text };
const summaryFields = {
  id: radarId, slug: radarSlug, category, type: articleType,
  title: z.string().trim().min(1).max(300), excerpt: z.string().trim().min(1).max(2000),
  thumbnail: imageSchema, publishedAt: publishedDate, featured: z.boolean(),
  tags: z.array(z.string().trim().min(1).max(100)).max(30), rating: score.optional(), ...versionFields,
};
// Stored records can include PK/SK, but public projections strip them deliberately.
export const summarySchema = z.object(summaryFields);
export const metadataSchema = z.object({ ...summaryFields, status: editorialStatus, publishedSort: instant, ...sourceFields })
  .refine(value => value.publishedSort === publicationSort(value.publishedAt));
export const contentSchema = z.object({
  postId: radarId, ...versionFields, coverImage: imageSchema, content: z.array(blockSchema).min(1).max(1000),
  author: z.strictObject({ name: text, avatar: httpsUrl.optional() }).optional(),
  purchaseLinks: purchaseLinksSchema,
  videoLinks: videoLinksSchema,
  set: setSchema.optional(), relatedSets: z.array(setSchema).optional(),
  prices: z.array(z.strictObject({ store: text, price: money, currency, url: httpsUrl })).optional(),
  relatedVideo: z.strictObject({ platform: z.enum(["tiktok", "instagram-reels"]), url: httpsUrl, title: text, description: text.optional() }).optional(),
  rumorImages: z.array(z.strictObject({ url: httpsUrl, alt: text, title: text, summary: text, rumorStatus: rumorStatusSchema.optional() })).optional(),
});
export const postSchema = z.object({ meta: metadataSchema, detail: contentSchema }).superRefine((value, ctx) => {
  if (value.meta.id !== value.detail.postId || value.meta.version !== value.detail.version || value.meta.updatedAt !== value.detail.updatedAt) {
    ctx.addIssue({ code: "custom", message: "Metadatos y contenido deben compartir identidad y versión." });
  }
  const ratings = value.detail.content.filter(block => block.type === "rating");
  if (ratings.length > 1 || (ratings[0] && value.meta.rating !== undefined && Math.abs(value.meta.rating - ratings[0].score / ratings[0].maxScore * 10) > 0.000001)) {
    ctx.addIssue({ code: "custom", path: ["meta", "rating"], message: "Calificación editorial contradictoria." });
  }
});
export const videoSchema = z.object({
  id: radarId, title: text, platform: z.enum(["tiktok", "instagram-reels"]), thumbnail: imageSchema,
  durationSeconds: z.number().int().positive(), publishedAt: publishedDate, publishedSort: instant, url: httpsUrl,
  status: editorialStatus, ...versionFields, ...sourceFields,
}).refine(value => value.publishedSort === publicationSort(value.publishedAt));
export const publicVideoSchema = videoSchema.refine(value => value.status === "published").transform(value => ({ id: value.id, title: value.title, platform: value.platform, thumbnail: value.thumbnail, durationSeconds: value.durationSeconds, publishedAt: value.publishedAt, url: value.url, schemaVersion: value.schemaVersion, version: value.version, updatedAt: value.updatedAt }));
export const releaseSchema = z.object({
  id: radarId, setNumber: z.string().regex(/^\d{1,12}$/), name: text, image: imageSchema,
  market: z.literal("MX"), releaseDate: civilDate, price: money, currency, status: commercialStatus,
  purchaseLinks: purchaseLinksSchema,
  videoLinks: videoLinksSchema,
  url: z.union([httpsUrl, z.string().regex(/^\/explore\/\d{1,12}$/)]), editorialStatus,
  sourceIds: z.array(text), ...versionFields, ...sourceFields,
});
export const publicReleaseSchema = releaseSchema.refine(value => value.editorialStatus === "published").transform(value => ({ id: value.id, setNumber: value.setNumber, name: value.name, image: value.image, market: value.market, releaseDate: value.releaseDate, price: value.price, currency: value.currency, status: value.status, purchaseLinks: value.purchaseLinks, videoLinks: value.videoLinks, url: value.url, schemaVersion: value.schemaVersion, version: value.version, updatedAt: value.updatedAt }));
const copyKeys = ["titleAccent", "title", "description", "latestTitle", "videosTitle", "videosDescription", "releaseTitle", "ratingLabel", "moreVideosLabel", "fewerVideosLabel", "allArticlesLabel", "fewerArticlesLabel", "fullCalendarLabel", "compactCalendarLabel", "emptyArticlesLabel", "filtersAriaLabel", "videoLinkLabel", "articleLinkLabel"] as const;
const calendarKeys = ["titlePrefix", "titleAccent", "subtitle", "description", "previousMonthLabel", "nextMonthLabel", "todayLabel", "releaseLabel", "moreReleasesLabel", "closeLabel", "dayReleasesLabel", "emptyMonthLabel", "upcomingTitle", "emptyUpcomingLabel"] as const;
export const configSchema = z.object({
  copy: z.strictObject(Object.fromEntries(copyKeys.map(key => [key, text])) as Record<typeof copyKeys[number], typeof text>),
  filters: z.array(z.strictObject({ value: z.enum(["todos", "rumor", "lanzamiento", "resena", "top"]), label: text })).length(5).refine(values => new Set(values.map(value => value.value)).size === 5),
  calendar: z.strictObject({ ...Object.fromEntries(calendarKeys.map(key => [key, text])) as Record<typeof calendarKeys[number], typeof text>, weekdays: z.array(text).length(7) }),
  videoLimit: z.number().int().min(1).max(50), releaseLimit: z.number().int().min(1).max(50), upcomingReleasesLimit: z.number().int().min(1).max(50),
  ...versionFields, ...sourceFields,
});
