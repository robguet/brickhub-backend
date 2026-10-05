import { createHash } from "node:crypto";
import { z } from "zod";
import { configSchema, postSchema, videoSchema, releaseSchema, publicationSort, commercialStatus, editorialStatus } from "./radar.schemas";
import { importManifestSchema, importSourceSchema, mediaBaseSchema, type ImportManifest } from "./radar-import.schemas";
import { type RadarEntity, type RadarWriteRepository } from "./radar.types";
import { entityKey, entityHash, entityVersion, validateEntitySize } from "./dynamodb-radar.repository";
import { RadarError } from "./radar.http-response";
export interface ImportIssue { path: string; message: string; }
export interface ImportOperation { entityId: string; action: "validate" | "created" | "updated" | "unchanged"; expectedVersion?: number; hash: string; }
export interface ImportResult { entityId: string; action: "created" | "updated" | "unchanged" | "conflict" | "failed"; }
export interface ImportReport {
  schemaVersion: 1; inputSha256: string; mode: "dry-run" | "apply"; generatedAt: string;
  sourceCounts: { articles: number; videos: number; releases: number };
  normalizedCounts: { articles: number; videos: number; releases: number };
  consolidatedDuplicates: { path: string; entityId: string }[];
  conflicts: ImportIssue[]; rejected: ImportIssue[]; operations: ImportOperation[]; appliedResults: ImportResult[]; importReady: boolean;
}
export interface PreparedImport { entities: RadarEntity[]; report: ImportReport; manifest: ImportManifest; requiredMedia: Record<string, string>; }
export interface ImportOptions { sourceSha256: string; sourceReference: string; manifest?: unknown; mediaBaseUrl?: string; publish?: string[]; now?: Date; }
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (typeof value === "object" && value !== null) return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => [key, stable(item)]));
  return value;
}
export function contentHash(value: unknown): string { return createHash("sha256").update(JSON.stringify(stable(value))).digest("hex"); }
function hashPayload(value: Record<string, unknown>): string {
  const payload = Object.fromEntries(Object.entries(value).filter(([key]) => !["version", "updatedAt", "schemaVersion", "sourceHash", "sourceReference"].includes(key)));
  return contentHash(payload);
}
const statusCode = (value: unknown): unknown => value === "Próximamente" ? "upcoming" : value === "Preventa" ? "preorder" : value === "Disponible" ? "available" : value;
const platformCode = (value: unknown): unknown => value === "TikTok" ? "tiktok" : value === "Instagram Reels" ? "instagram-reels" : value;
function versionEntity(entity: RadarEntity, version: number, updatedAt: string): RadarEntity {
  if (entity.kind === "post") return { kind: "post", value: { meta: { ...entity.value.meta, version, updatedAt }, detail: { ...entity.value.detail, version, updatedAt } } };
  return { ...entity, value: { ...entity.value, version, updatedAt } } as RadarEntity;
}
export function prepareImport(raw: unknown, options: ImportOptions): PreparedImport {
  const now = (options.now ?? new Date()).toISOString();
  const report: ImportReport = { schemaVersion: 1, inputSha256: options.sourceSha256, mode: "dry-run", generatedAt: now, sourceCounts: { articles: 0, videos: 0, releases: 0 }, normalizedCounts: { articles: 0, videos: 0, releases: 0 }, consolidatedDuplicates: [], conflicts: [], rejected: [], operations: [], appliedResults: [], importReady: false };
  let manifest: ImportManifest;
  try {
    manifest = importManifestSchema.parse(options.manifest ?? { schemaVersion: 1, sourceSha256: options.sourceSha256 });
    if (manifest.sourceSha256 !== options.sourceSha256) report.conflicts.push({ path: "manifest.sourceSha256", message: "El manifiesto no corresponde al archivo de entrada." });
  } catch (error) {
    manifest = importManifestSchema.parse({ schemaVersion: 1, sourceSha256: options.sourceSha256 });
    report.rejected.push({ path: "manifest", message: error instanceof z.ZodError ? error.issues.map(issue => issue.message).join("; ") : "Manifiesto inválido." });
  }
  const requiredMedia: Record<string, string> = {};
  const entities: RadarEntity[] = [];
  const prepared = { entities, report, manifest, requiredMedia };
  const source = importSourceSchema.safeParse(raw);
  if (!source.success) {
    report.rejected.push(...source.error.issues.map(issue => ({ path: issue.path.join("."), message: issue.message })));
    return prepared;
  }
  let base: string | undefined;
  if (options.mediaBaseUrl) {
    const parsed = mediaBaseSchema.safeParse(options.mediaBaseUrl);
    if (parsed.success) base = parsed.data.replace(/\/$/, "");
    else report.rejected.push({ path: "mediaBaseUrl", message: "Se requiere una URL HTTPS válida sin query ni fragmento." });
  }
  const mediaErrors = new Set<string>();
  function media(value: unknown): unknown {
    if (typeof value !== "string" || !value.startsWith("/images/")) return value;
    const key = manifest.mediaObjects[value];
    if (!key || !base) {
      if (!mediaErrors.has(value)) { report.conflicts.push({ path: value, message: "Falta mapeo S3 o URL base HTTPS del CDN." }); mediaErrors.add(value); }
      return `https://unresolved.invalid${value}`;
    }
    requiredMedia[value] = key;
    return `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;
  }
  function transform(value: unknown, key?: string): unknown {
    if (Array.isArray(value)) return value.map(item => transform(item));
    if (typeof value === "object" && value !== null) return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, transform(item, name)]));
    return ["url", "image", "avatar", "thumbnail"].includes(key ?? "") ? media(value) : value;
  }
  const data = source.data;
  let articles: Record<string, unknown>[];
  let videos: Record<string, unknown>[];
  let releases: Record<string, unknown>[];
  let config: Record<string, unknown>;
  if ("articles" in data) {
    articles = data.articles; videos = data.videos; releases = data.releases;
    config = Object.fromEntries(Object.entries(data).filter(([key]) => !["articles", "videos", "releases"].includes(key)));
  } else {
    config = data.config; videos = data.videos; releases = data.releaseEvents;
    const details = new Map<string, Record<string, unknown>>();
    for (const detail of data.postDetails) {
      const id = String(detail.postId);
      if (details.has(id)) report.conflicts.push({ path: `postDetails.${id}`, message: "Detalle duplicado." });
      details.set(id, detail);
    }
    articles = data.postSummaries.map(summary => {
      const id = String(summary.id); const detail = details.get(id);
      if (!detail) report.conflicts.push({ path: `postDetails.${id}`, message: "Falta contenido completo." });
      return { ...summary, ...detail, id };
    });
    const ids = new Set(data.postSummaries.map(summary => String(summary.id)));
    for (const id of details.keys()) if (!ids.has(id)) report.conflicts.push({ path: `postDetails.${id}`, message: "Contenido sin resumen." });
  }
  report.sourceCounts = { articles: articles.length, videos: videos.length, releases: releases.length };
  const lifecycle = { schemaVersion: 1, version: 1, updatedAt: now, sourceHash: "0".repeat(64), sourceReference: options.sourceReference };
  const seenIds = new Set<string>();
  const slugs = new Set<string>();
  function add(candidate: RadarEntity, path: string): void {
    const key = entityKey(candidate).PK;
    if (seenIds.has(key)) { report.conflicts.push({ path, message: "Identificador duplicado." }); return; }
    validateEntitySize(candidate);
    seenIds.add(key); entities.push(candidate);
    report.operations.push({ entityId: key, action: "validate", hash: entityHash(candidate), ...(manifest.expectedVersions[key] ? { expectedVersion: manifest.expectedVersions[key] } : {}) });
  }
  function rejection(path: string, error: unknown): void {
    if (error instanceof z.ZodError) report.rejected.push(...error.issues.map(issue => ({ path: `${path}.${issue.path.join(".")}`, message: issue.message })));
    else report.rejected.push({ path, message: "Contenido inválido o superior al presupuesto de tamaño." });
  }
  const articleAllowed = new Set(["id", "slug", "category", "type", "title", "excerpt", "image", "imageAlt", "thumbnail", "publishedAt", "featured", "tags", "rating", "schemaVersion", "version", "updatedAt", "status", "postId", "coverImage", "content", "author", "set", "relatedSets", "prices", "relatedVideo", "rumorImages", "purchaseLinks", "videoLinks"]);
  const releaseClaims: { setNumber: string; releaseDate: string; status: string }[] = [];
  for (const [i, original] of articles.entries()) {
    const path = `articles.${i}`;
    try {
      for (const key of Object.keys(original)) if (!articleAllowed.has(key)) throw new Error("Unknown source field");
      const a = transform(original) as Record<string, unknown>;
      const rating = a.rating;
      if (a.status !== undefined) editorialStatus.parse(a.status);
      const state = manifest.postStatuses[String(a.id)] ?? ((options.publish ?? []).includes(String(a.id)) ? "published" : a.status === "withdrawn" ? "withdrawn" : "draft");
      const meta = { ...lifecycle, id: a.id, slug: a.slug, category: a.category, type: a.type, title: a.title, excerpt: a.excerpt, thumbnail: a.thumbnail ?? { url: a.image, alt: a.imageAlt }, publishedAt: a.publishedAt, publishedSort: publicationSort(String(a.publishedAt)), featured: a.featured ?? false, tags: a.tags ?? [], status: state, ...(rating === undefined ? {} : { rating }) };
      const optional = Object.fromEntries(["author", "set", "relatedSets", "prices", "relatedVideo", "rumorImages", "purchaseLinks", "videoLinks"].filter(key => a[key] !== undefined).map(key => [key, a[key]]));
      const detail = { ...lifecycle, postId: a.id, coverImage: a.coverImage ?? meta.thumbnail, content: a.content, ...optional };
      const post = postSchema.parse({ meta, detail });
      if (slugs.has(post.meta.slug)) report.conflicts.push({ path, message: "Slug duplicado." });
      slugs.add(post.meta.slug);
      post.meta.sourceHash = hashPayload({ ...post.meta, detail: hashPayload(post.detail) });
      const principal = post.detail.set?.number;
      if (principal) for (const block of post.detail.content) if (block.type === "releaseInfo") releaseClaims.push({ setNumber: principal, releaseDate: block.releaseDate, status: block.status });
      add({ kind: "post", value: post }, path);
    } catch (error) { rejection(path, error); }
  }
  for (const [i, original] of videos.entries()) {
    try {
      const a = transform(original) as Record<string, unknown>;
      const duration = /^([0-9]+):([0-5][0-9])$/.exec(String(a.duration));
      const video = videoSchema.parse({ ...a, ...lifecycle, thumbnail: typeof a.thumbnail === "string" ? { url: a.thumbnail, alt: a.thumbnailAlt } : a.thumbnail,
        durationSeconds: a.durationSeconds ?? (duration ? Number(duration[1]) * 60 + Number(duration[2]) : undefined), platform: platformCode(a.platform), publishedSort: publicationSort(String(a.publishedAt)), status: manifest.publishedVideos.includes(String(a.id)) ? "published" : "draft" });
      video.sourceHash = hashPayload(video); add({ kind: "video", value: video }, `videos.${i}`);
    } catch (error) { rejection(`videos.${i}`, error); }
  }
  const naturalEvents = new Map<string, Record<string, unknown>>();
  const eventEntities = new Map<string, RadarEntity>();
  for (const [i, original] of releases.entries()) {
    try {
      const a = transform(original) as Record<string, unknown>;
      const resolution = manifest.releaseResolutions.find(value => value.setNumber === a.setNumber && (!value.sourceIds || value.sourceIds.includes(String(a.id))));
      if (resolution?.decision === "distinct-events" && "articles" in data) throw new Error("Use explicit events in a normalized bundle for distinct-events");
      const releaseDate = resolution?.releaseDate ?? a.releaseDate;
      const status = commercialStatus.parse(resolution?.status ?? statusCode(a.status));
      for (const claim of releaseClaims.filter(value => value.setNumber === a.setNumber)) {
        if (claim.releaseDate !== releaseDate || claim.status !== status) report.conflicts.push({ path: `releases.${i}`, message: "Fecha o estado contradictorio entre artículo y calendario; resolver editorialmente." });
      }
      const key = `MX#${String(a.setNumber)}#${String(releaseDate)}`;
      const payload: Record<string, unknown> = { ...a, releaseDate, status }; delete payload.id; delete payload.sourceIds;
      const previous = naturalEvents.get(key);
      if (previous) {
        if (contentHash(previous) !== contentHash(payload)) report.conflicts.push({ path: `releases.${i}`, message: "Evento repetido con datos diferentes." });
        else {
          report.consolidatedDuplicates.push({ path: `releases.${i}`, entityId: key });
          const entry = eventEntities.get(key);
          if (entry?.kind === "release") {
            entry.value.sourceIds.push(String(a.id)); entry.value.sourceHash = hashPayload(entry.value);
            const operation = report.operations.find(value => value.entityId === entityKey(entry).PK);
            if (operation) operation.hash = entry.value.sourceHash;
          }
        }
        continue;
      }
      naturalEvents.set(key, payload);
      const id = "articles" in data ? `MX-${String(a.setNumber)}-${String(releaseDate)}` : String(a.id);
      const release = releaseSchema.parse({ ...a, ...lifecycle, id, market: a.market ?? "MX", releaseDate, status,
        image: typeof a.image === "string" ? { url: a.image, alt: a.imageAlt } : a.image,
        sourceIds: a.sourceIds ?? [String(a.id)], editorialStatus: manifest.publishedReleases.includes(id) ? "published" : "draft" });
      release.sourceHash = hashPayload(release); const entity: RadarEntity = { kind: "release", value: release }; add(entity, `releases.${i}`); eventEntities.set(key, entity);
    } catch (error) { rejection(`releases.${i}`, error); }
  }
  try { const value = configSchema.parse({ ...config, ...lifecycle }); value.sourceHash = hashPayload(value); if (manifest.publishConfig) add({ kind: "config", value }, "config"); }
  catch (error) { rejection("config", error); }
  const selectors: [string, string[]][] = [["publish", options.publish ?? []], ["manifest.postStatuses", Object.keys(manifest.postStatuses)], ["manifest.publishedVideos", manifest.publishedVideos], ["manifest.publishedReleases", manifest.publishedReleases]];
  const knownIds = { post: new Set<string>(), video: new Set<string>(), release: new Set<string>() };
  for (const entity of entities) if (entity.kind !== "config") knownIds[entity.kind].add(entity.kind === "post" ? entity.value.meta.id : entity.value.id);
  for (const [path, ids] of selectors) for (const id of ids) {
    const kind = path.includes("Videos") ? "video" : path.includes("Releases") ? "release" : "post";
    if (!knownIds[kind].has(id)) report.conflicts.push({ path, message: `Identificador desconocido: ${id}` });
  }
  report.normalizedCounts = { articles: entities.filter(value => value.kind === "post").length, videos: entities.filter(value => value.kind === "video").length, releases: entities.filter(value => value.kind === "release").length };
  report.importReady = report.conflicts.length === 0 && report.rejected.length === 0;
  return prepared;
}
export async function applyImport(prepared: PreparedImport, writer: RadarWriteRepository, uploadMedia: () => Promise<void> = async () => {}): Promise<ImportReport> {
  const { report, manifest, entities } = prepared;
  report.mode = "apply";
  if (!report.importReady) return report;
  const plans: { next: RadarEntity; previous?: RadarEntity; action: "created" | "updated" | "unchanged" }[] = [];
  report.operations = [];
  // Preflight every entity and reservation before any S3/DynamoDB mutation.
  for (const entity of entities) {
    const id = entityKey(entity).PK;
    try {
      const previous = await writer.getEntity(entity);
      await writer.checkReservations(entity);
      if (previous?.kind === "post" && entity.kind === "post" && previous.value.meta.slug !== entity.value.meta.slug) throw new RadarError("CONFLICT");
      const unchanged = previous && entityHash(previous) === entityHash(entity);
      if (previous && !unchanged && manifest.expectedVersions[id] !== entityVersion(previous)) throw new RadarError("CONFLICT");
      const action = !previous ? "created" : unchanged ? "unchanged" : "updated";
      const next = versionEntity(entity, previous ? entityVersion(previous) + 1 : 1, report.generatedAt);
      validateEntitySize(next);
      plans.push({ next, previous, action });
      report.operations.push({ entityId: id, action, hash: entityHash(entity), ...(previous ? { expectedVersion: entityVersion(previous) } : {}) });
    } catch (error) {
      if (!(error instanceof RadarError && error.code === "CONFLICT")) { report.appliedResults.push({ entityId: id, action: "failed" }); report.importReady = false; return report; }
      report.conflicts.push({ path: id, message: "Reserva o versión incompatible; revisar el manifiesto." });
    }
  }
  if (report.conflicts.length) { report.importReady = false; return report; }
  try { await uploadMedia(); }
  catch { report.appliedResults.push({ entityId: "MEDIA", action: "failed" }); report.importReady = false; return report; }
  for (const plan of plans) {
    const id = entityKey(plan.next).PK;
    if (plan.action === "unchanged") { report.appliedResults.push({ entityId: id, action: "unchanged" }); continue; }
    try { await writer.write(plan.next, plan.previous); report.appliedResults.push({ entityId: id, action: plan.action }); }
    catch (error) {
      const action = error instanceof RadarError && error.code === "CONFLICT" ? "conflict" : "failed";
      report.appliedResults.push({ entityId: id, action }); report.importReady = false;
      if (action === "conflict") report.conflicts.push({ path: id, message: "El contenido cambió durante apply." });
      break;
    }
  }
  return report;
}
