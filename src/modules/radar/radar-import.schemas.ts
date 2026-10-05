import { z } from "zod";
import { civilDate, commercialStatus, editorialStatus, httpsUrl, radarId } from "./radar.schemas";
export const mediaKeySchema = z.string().max(900).regex(/^radar\/[a-zA-Z0-9/_\-.]+$/).refine(value => !value.split("/").some(part => part === "." || part === ".." || !part));
export const importManifestSchema = z.strictObject({
  schemaVersion: z.literal(1), sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
  mediaObjects: z.record(z.string(), mediaKeySchema).default({}),
  expectedVersions: z.record(z.string(), z.number().int().positive()).default({}),
  releaseResolutions: z.array(z.strictObject({
    setNumber: z.string().regex(/^\d{1,12}$/), market: z.literal("MX").default("MX"),
    sourceIds: z.array(z.string()).optional(), decision: z.enum(["keep-date", "reschedule", "distinct-events"]).default("keep-date"),
    releaseDate: civilDate, status: commercialStatus.optional(), reason: z.string().min(1).optional(),
  })).default([]),
  publishedVideos: z.array(radarId).default([]), publishedReleases: z.array(radarId).default([]), publishConfig: z.boolean().default(false),
  postStatuses: z.record(radarId, editorialStatus).default({}),
});
export type ImportManifest = z.infer<typeof importManifestSchema>;
const records = z.array(z.record(z.string(), z.unknown()));
const configFields = { copy: z.unknown(), filters: z.unknown(), videoLimit: z.unknown(), releaseLimit: z.unknown(), upcomingReleasesLimit: z.unknown(), calendar: z.unknown() };
export const importSourceSchema = z.union([
  z.strictObject({ ...configFields, articles: records, videos: records, releases: records }),
  z.strictObject({ schemaVersion: z.literal(1), importReady: z.boolean(), config: z.strictObject(configFields), postSummaries: records, postDetails: records, videos: records, releaseEvents: records, validationReport: z.unknown() }),
]);
export const mediaBaseSchema = httpsUrl.refine(value => {
  const url = new URL(value); return !url.search && !url.hash;
});
