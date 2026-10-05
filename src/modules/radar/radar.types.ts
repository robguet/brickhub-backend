import type { z } from "zod";
import type { summarySchema, metadataSchema, contentSchema, videoSchema, releaseSchema, configSchema, category, postSchema } from "./radar.schemas";
export type RadarCategory = z.infer<typeof category>;
export type PostSummary = z.infer<typeof summarySchema>;
export type PostMetadata = z.infer<typeof metadataSchema>;
export type PostContent = z.infer<typeof contentSchema>;
export type Post = z.infer<typeof postSchema>;
export type Video = z.infer<typeof videoSchema>;
export type Release = z.infer<typeof releaseSchema>;
export type RadarConfig = z.infer<typeof configSchema>;
export type RadarEntity = { kind: "post"; value: Post } | { kind: "video"; value: Video } | { kind: "release"; value: Release } | { kind: "config"; value: RadarConfig };
export interface Page<T> { items: T[]; lastSk?: string; }
export interface FeedQuery { pk: string; limit: number; ascending: boolean; lower?: string; upper?: string; lastSk?: string; }
export interface RadarRepository {
  queryFeed(query: FeedQuery, signal: AbortSignal): Promise<Page<Record<string, unknown>>>;
  getPost(slug: string, signal: AbortSignal): Promise<Post | undefined>;
  getConfig(signal: AbortSignal): Promise<RadarConfig | undefined>;
}
export interface RadarWriteRepository {
  getEntity(entity: RadarEntity): Promise<RadarEntity | undefined>;
  checkReservations(entity: RadarEntity): Promise<void>;
  write(entity: RadarEntity, previous: RadarEntity | undefined): Promise<void>;
}
export const feeds = {
  posts: "FEED#POSTS", category: (value: RadarCategory) => `FEED#CATEGORY#${value}`,
  featured: "FEED#FEATURED", videos: "FEED#VIDEOS", releases: "FEED#RELEASES#MX",
  month: (value: string) => `FEED#RELEASES#MX#${value}`,
};
