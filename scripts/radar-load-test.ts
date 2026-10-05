import { parseArgs } from "node:util";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { z } from "zod";
import { httpsUrl, radarId, summarySchema } from "../src/modules/radar/radar.schemas";
const options = {
  generate: { type: "boolean" }, run: { type: "boolean" }, output: { type: "string" }, manifest: { type: "string" },
  "run-id": { type: "string" }, count: { type: "string" }, "api-url": { type: "string" }, "token-env": { type: "string" },
  "image-url": { type: "string" }, concurrency: { type: "string" }, iterations: { type: "string" }, environment: { type: "string" },
} as const;
const positive = (value: string | undefined, fallback: number, max: number) => z.coerce.number().int().positive().max(max).parse(value ?? fallback);
async function main(): Promise<void> {
  const { values } = parseArgs({ options, strict: true });
  if (Boolean(values.generate) === Boolean(values.run) || !values.output || !values["run-id"]) throw new Error("Specify generate or run, output and run-id");
  const runId = radarId.parse(values["run-id"]);
  const count = positive(values.count, 10_000, 100_000);
  const prefix = `radar-load-${runId}-`;
  if (prefix.length > 100) throw new Error("run-id too long");
  const id = (i: number) => `${prefix}${String(i).padStart(6, "0")}`;
  if (values.generate) {
    if (!values.manifest) throw new Error("manifest required");
    const fixture = JSON.parse(await readFile("tests/fixtures/radar/radar-source.json", "utf8")) as Record<string, unknown>;
    const { copy, filters, calendar, videoLimit, releaseLimit, upcomingReleasesLimit } = fixture;
    const image = httpsUrl.parse(values["image-url"] ?? "https://example.invalid/radar-load.svg");
    const categories = ["rumor", "lanzamiento", "resena", "top"];
    const articles = Array.from({ length: count }, (_, i) => ({
      id: id(i), slug: id(i), category: categories[i % 4], type: "opinion", title: `Load fixture ${i}`, excerpt: "Identifiable development load fixture.",
      image, imageAlt: "Fixture", publishedAt: "2026-10-05", featured: i === 0, tags: ["load-fixture", runId],
      content: [{ type: "paragraph", text: "Development fixture. ".repeat(100) }],
    }));
    const bundle = JSON.stringify({ copy, filters, calendar, videoLimit, releaseLimit, upcomingReleasesLimit, articles, videos: [], releases: [] }, null, 2) + "\n";
    await writeFile(values.output, bundle);
    await writeFile(values.manifest, JSON.stringify({ schemaVersion: 1, sourceSha256: createHash("sha256").update(bundle).digest("hex"), postStatuses: Object.fromEntries(articles.map(article => [article.id, "published"])) }, null, 2) + "\n");
    // Exact IDs enable a separately reviewed, scoped cleanup without scanning production data.
    await writeFile(`${values.output}.ids.json`, JSON.stringify({ runId, entityIds: articles.map(article => article.id), slugs: articles.map(article => article.slug) }, null, 2) + "\n");
    console.info(JSON.stringify({ generated: count, output: values.output, manifest: values.manifest }));
    return;
  }
  if (values.environment !== "dev" || !values["api-url"] || !values["token-env"]) throw new Error("Explicit dev destination required");
  const api = httpsUrl.parse(values["api-url"]).replace(/\/$/, "");
  const token = process.env[values["token-env"]];
  if (!token) throw new Error("Missing token environment variable");
  const concurrency = positive(values.concurrency, 50, 100);
  const iterations = positive(values.iterations, 100, 1000);
  const results: { kind: "page" | "detail"; elapsedMs: number; status: number }[] = [];
  const ids = new Set<string>();
  let cursor: string | null = null;
  const pageSchema = z.object({ status: z.literal("success"), data: z.object({ posts: z.array(summarySchema), page: z.object({ nextCursor: z.string().nullable() }) }) });
  do {
    const url = new URL(`${api}/v1/radar/posts`); url.searchParams.set("limit", "50"); if (cursor) url.searchParams.set("cursor", cursor);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error("Fixture discovery failed");
    const page = pageSchema.parse(await response.json());
    for (const post of page.data.posts) if (post.id.startsWith(prefix)) ids.add(post.id);
    cursor = page.data.page.nextCursor;
  } while (cursor);
  if (ids.size !== count) throw new Error("Fixture count differs from requested load population");
  await Promise.all(Array.from({ length: concurrency }, async (_, worker) => {
    for (let i = 0; i < iterations; i++) {
      const kind = i % 2 ? "detail" : "page";
      const url = kind === "page" ? `${api}/v1/radar/posts?limit=20` : `${api}/v1/radar/posts/${id((worker * iterations + i) % count)}`;
      const started = performance.now(); let status = 0;
      try { const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) }); await response.arrayBuffer(); status = response.status; }
      catch { /* timeouts count as failures and remain in latency distribution */ }
      results.push({ kind, elapsedMs: performance.now() - started, status });
    }
  }));
  const metrics = ["page", "detail"].map(kind => {
    const group = results.filter(value => value.kind === kind); const times = group.map(value => value.elapsedMs).sort((a, b) => a - b);
    const p95 = times[Math.max(0, Math.ceil(times.length * 0.95) - 1)] ?? 0;
    return { kind, count: group.length, errors: group.filter(value => value.status !== 200).length, p95Ms: p95, meetsTarget: p95 < 2000 && group.every(value => value.status === 200) };
  });
  await writeFile(values.output, JSON.stringify({ runId, count, concurrency, iterations, metrics, results }, null, 2) + "\n");
  console.info(JSON.stringify({ metrics, report: values.output })); process.exitCode = metrics.every(value => value.meetsTarget) ? 0 : 2;
}
void main().catch(() => { console.error("No fue posible generar o medir la carga. Revisa argumentos, fixtures y destino dev."); process.exitCode = 1; });
