import type { Post, RadarRepository } from "../../../src/modules/radar/radar.types";
export function post(id = "sample", category: Post["meta"]["category"] = "resena"): Post {
  const version = { schemaVersion: 1 as const, version: 1, updatedAt: "2026-10-05T12:00:00.000Z" };
  return { meta: { id, slug: id, category, type: "review", title: "Título", excerpt: "Resumen", thumbnail: { url: "https://media.example.com/radar/test.svg", alt: "Imagen" }, publishedAt: "2026-07-20", publishedSort: "2026-07-20T00:00:00.000Z", featured: true, tags: [], status: "published", sourceHash: "a".repeat(64), sourceReference: "fixture", ...version }, detail: { purchaseLinks: [], videoLinks: [], postId: id, coverImage: { url: "https://media.example.com/radar/cover.svg", alt: "Portada" }, content: [{ type: "paragraph", text: "Artículo" }], ...version } };
}
export function repository(overrides: Partial<RadarRepository> = {}): RadarRepository {
  return { queryFeed: async () => ({ items: [] }), getPost: async () => undefined, getConfig: async () => undefined, ...overrides };
}
