import { expect, it } from "vitest";
import { prepared, source, inputHash, manifest } from "../../../fixtures/radar/import-helper";
import { prepareImport } from "../../../../src/modules/radar/radar-import.service";
it("preserves all nine content sequences and optional fields, deduplicates releases", () => {
  const result = prepared(); expect(result.report.conflicts).toEqual([]); expect(result.report.rejected).toEqual([]); expect(result.report.importReady).toBe(true);
  expect(result.report.normalizedCounts).toEqual({ articles: 9, videos: 5, releases: 4 });
  expect(result.report.consolidatedDuplicates).toHaveLength(3);
  const articles = source.articles as { id: string; content: { type: string; text?: string }[] }[];
  for (const article of articles) {
    const entity = result.entities.find(value => value.kind === "post" && value.value.meta.id === article.id);
    if (entity?.kind !== "post") throw new Error("missing");
    expect(entity.value.detail.content.map(block => block.type)).toEqual(article.content.map(block => block.type));
    expect(entity.value.meta.status).toBe("draft");
  }
  const tie = result.entities.find(value => value.kind === "post" && value.value.meta.id === "tie-interceptor-review");
  expect(tie?.value).toHaveProperty("detail.author.name", "Roberto"); expect(tie?.value).toHaveProperty("detail.prices");
});
it("reports missing media and source date/status contradictions instead of guessing", () => {
  const result = prepareImport(source, { sourceSha256: inputHash, sourceReference: "fixture" });
  expect(result.report.importReady).toBe(false); expect(result.report.conflicts.some(issue => issue.path.startsWith("/images/"))).toBe(true);
  expect(result.report.conflicts.some(issue => issue.path.startsWith("releases"))).toBe(true);
});
it("rejects mismatched manifest source and unknown publish identifiers", () => {
  const m = manifest(); m.sourceSha256 = "0".repeat(64);
  expect(prepareImport(source, { sourceSha256: inputHash, sourceReference: "fixture", manifest: m }).report.importReady).toBe(false);
  expect(prepared(["not-a-post"]).report.importReady).toBe(false);
});
it("does not save config unless publishing it was explicitly selected", () => {
  const m = manifest(); m.publishConfig = false;
  const result = prepareImport(source, { sourceSha256: inputHash, sourceReference: "fixture", manifest: m, mediaBaseUrl: "https://media.example.com" });
  expect(result.entities.some(value => value.kind === "config")).toBe(false);
});
it("preserves every block value, changing only documented media references", () => {
  const result = prepared(); const m = manifest();
  function converted(value: unknown): unknown {
    if (typeof value === "string" && value.startsWith("/images/")) return `https://media.example.com/${m.mediaObjects[value]}`;
    if (Array.isArray(value)) return value.map(converted);
    if (typeof value === "object" && value !== null) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, converted(item)]));
    return value;
  }
  for (const original of source.articles as Record<string, unknown>[]) {
    const entity = result.entities.find(value => value.kind === "post" && value.value.meta.id === original.id);
    if (entity?.kind !== "post") throw new Error("missing");
    expect(entity.value.detail.content).toEqual(converted(original.content));
    for (const key of ["author", "set", "relatedSets", "prices", "relatedVideo", "rumorImages"] as const) if (original[key] !== undefined) expect(entity.value.detail[key]).toEqual(converted(original[key]));
  }
});
