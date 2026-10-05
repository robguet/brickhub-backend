import { feeds, type RadarRepository } from "./radar.types";
import { summarySchema, publicVideoSchema, publicReleaseSchema, configSchema, postSchema, publicationSort } from "./radar.schemas";
import { decodeCursor, encodeCursor, type CursorScope } from "./radar.cursor";
import { RadarError } from "./radar.http-response";
import type { RadarCategory } from "./radar.types";
export type RadarRequest =
  | { kind: "posts"; limit: number; category?: RadarCategory; cursor?: string }
  | { kind: "featured" }
  | { kind: "detail"; slug: string }
  | { kind: "videos"; limit: number; cursor?: string }
  | { kind: "releases"; limit: number; month?: string; from?: string; cursor?: string }
  | { kind: "config" };
// A single deadline is shared by all sequential reads of a request.
export async function withRadarDeadline<T>(work: (signal: AbortSignal) => Promise<T>, milliseconds = 4000): Promise<T> {
  const abort = new AbortController();
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([work(abort.signal), new Promise<never>((_, reject) => {
      timer = setTimeout(() => { abort.abort(); reject(new RadarError("INTERNAL_ERROR")); }, milliseconds);
    })]);
  } finally { if (timer) clearTimeout(timer); abort.abort(); }
}
export function todayInMexico(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find(value => value.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export class RadarService {
  public constructor(private readonly repository: RadarRepository, private readonly now: () => Date = () => new Date()) {}
  public async execute(request: RadarRequest): Promise<Record<string, unknown>> {
    return withRadarDeadline(async signal => {
      if (request.kind === "detail") {
        const raw = await this.repository.getPost(request.slug, signal);
        if (!raw) throw new RadarError("NOT_FOUND");
        const post = postSchema.parse(raw);
        if (post.meta.status !== "published") throw new RadarError("NOT_FOUND");
        const detail = Object.fromEntries(Object.entries(post.detail).filter(([key]) => key !== "postId"));
        return { post: { ...summarySchema.parse(post.meta), ...detail } };
      }
      if (request.kind === "config") {
        const stored = await this.repository.getConfig(signal);
        if (!stored) throw new RadarError("NOT_FOUND");
        const config = Object.fromEntries(Object.entries(configSchema.parse(stored)).filter(([key]) => !["sourceHash", "sourceReference"].includes(key)));
        return { config };
      }
      if (request.kind === "featured") {
        const result = await this.repository.queryFeed({ pk: feeds.featured, limit: 1, ascending: false }, signal);
        return { post: result.items[0] ? summarySchema.parse(result.items[0]) : null };
      }
      const scope: CursorScope = { kind: request.kind, limit: request.limit, direction: request.kind === "releases" ? "asc" : "desc" };
      let pk: string;
      let lower: string | undefined;
      let upper: string | undefined;
      if (request.kind === "releases") {
        scope.mode = request.month ? "month" : "upcoming";
        if (request.month) {
          scope.month = request.month;
          pk = feeds.month(request.month);
          lower = `${request.month}-01#`;
          upper = `${request.month}-31#~`;
        } else {
          // Decode the previous scope before defaulting to today's date after midnight.
          let from = request.from;
          if (!from && request.cursor) {
            try {
              const old: unknown = JSON.parse(Buffer.from(request.cursor, "base64url").toString("utf8"));
              if (old !== null && typeof old === "object" && "from" in old && typeof old.from === "string") from = old.from;
            } catch { throw new RadarError("VALIDATION_ERROR"); }
          }
          scope.from = from ?? todayInMexico(this.now());
          pk = feeds.releases;
          lower = `${scope.from}#`;
        }
      } else {
        pk = request.kind === "videos" ? feeds.videos : request.category ? feeds.category(request.category) : feeds.posts;
        if (request.kind === "posts" && request.category) scope.category = request.category;
      }
      const cursor = decodeCursor(request.cursor, scope);
      let upperBound = cursor?.upperBound;
      if (request.kind !== "releases") {
        if (!upperBound) {
          upperBound = this.now().toISOString();
          const latest = await this.repository.queryFeed({ pk, limit: 1, ascending: false }, signal);
          if (latest.items[0]) {
            const date = latest.items[0].publishedAt;
            if (typeof date !== "string") throw new RadarError("INTERNAL_ERROR");
            const sort = publicationSort(date);
            if (sort > upperBound) upperBound = sort;
          }
        }
        upper = `${upperBound}#~`;
      }
      const result = await this.repository.queryFeed({ pk, limit: request.limit, ascending: scope.direction === "asc", lower, upper, lastSk: cursor?.lastSk }, signal);
      const page = { limit: request.limit, nextCursor: encodeCursor(scope, result.lastSk, upperBound) };
      if (request.kind === "posts") return { posts: result.items.map(item => summarySchema.parse(item)), page };
      if (request.kind === "videos") return { videos: result.items.map(item => publicVideoSchema.parse(item)), page };
      return { releases: result.items.map(item => publicReleaseSchema.parse(item)), page };
    });
  }
}
