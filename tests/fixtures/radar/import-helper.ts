import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { importManifestSchema } from "../../../src/modules/radar/radar-import.schemas";
import { prepareImport } from "../../../src/modules/radar/radar-import.service";
const bytes = readFileSync("tests/fixtures/radar/radar-source.json");
export const source: Record<string, unknown> = JSON.parse(bytes.toString());
export const inputHash = createHash("sha256").update(bytes).digest("hex");
function paths(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(paths);
  if (typeof value === "object" && value !== null) return Object.entries(value).flatMap(([key, item]) => ["image", "avatar", "thumbnail", "url"].includes(key) && typeof item === "string" && item.startsWith("/images/") ? [item] : paths(item));
  return [];
}
export function manifest() {
  return importManifestSchema.parse({ schemaVersion: 1, sourceSha256: inputHash,
    mediaObjects: Object.fromEntries([...new Set(paths(source))].map(path => [path, `radar/${path.split("/").slice(2).join("/")}`])),
    releaseResolutions: [{ setNumber: "75383", releaseDate: "2026-07-22", status: "available", reason: "Editorial fixture resolution" }], publishConfig: true,
    publishedVideos: ["rumores-2026"],
  });
}
export function prepared(publish: string[] = []) {
  return prepareImport(source, { sourceSha256: inputHash, sourceReference: "fixture", manifest: manifest(), mediaBaseUrl: "https://media.example.com", publish, now: new Date("2026-10-05T12:00:00Z") });
}
