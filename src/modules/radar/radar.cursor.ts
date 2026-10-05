import { z } from "zod";
import { RadarError } from "./radar.http-response";
import { category, civilDate, instant, month, publicationSort, radarId } from "./radar.schemas";
export interface CursorScope { kind: "posts" | "videos" | "releases"; limit: number; direction: "asc" | "desc"; category?: string; mode?: "month" | "upcoming"; month?: string; from?: string; }
export interface RadarCursor extends CursorScope { v: 1; upperBound?: string; lastSk: string; }
const cursorSchema = z.strictObject({
  v: z.literal(1), kind: z.enum(["posts", "videos", "releases"]), limit: z.number().int().min(1).max(50),
  direction: z.enum(["asc", "desc"]), category: category.optional(), mode: z.enum(["month", "upcoming"]).optional(),
  month: month.optional(), from: civilDate.optional(), upperBound: instant.optional(), lastSk: z.string().min(1).max(256),
});
export function decodeCursor(encoded: string | undefined, scope: CursorScope): RadarCursor | undefined {
  if (encoded === undefined) return undefined;
  try {
    if (encoded.length > 4096 || !/^[A-Za-z0-9_-]+$/.test(encoded)) throw new Error("encoding");
    const bytes = Buffer.from(encoded, "base64url");
    if (bytes.byteLength > 2048 || bytes.toString("base64url") !== encoded) throw new Error("encoding");
    const cursor = cursorSchema.parse(JSON.parse(bytes.toString("utf8")));
    for (const key of ["kind", "limit", "direction", "category", "mode", "month", "from"] as const) {
      if (cursor[key] !== scope[key]) throw new Error("scope");
    }
    const separator = cursor.lastSk.lastIndexOf("#");
    const date = cursor.lastSk.slice(0, separator);
    radarId.parse(cursor.lastSk.slice(separator + 1));
    if (cursor.kind === "releases") {
      civilDate.parse(date);
      if (cursor.upperBound || (cursor.month && !date.startsWith(`${cursor.month}-`)) || (cursor.from && date < cursor.from)) throw new Error("range");
    } else {
      if (!cursor.upperBound || publicationSort(date) !== date || date > cursor.upperBound) throw new Error("range");
    }
    return cursor;
  } catch { throw new RadarError("VALIDATION_ERROR"); }
}
export function encodeCursor(scope: CursorScope, lastSk: string | undefined, upperBound?: string): string | null {
  if (!lastSk) return null;
  const value = { ...scope, v: 1, lastSk, ...(upperBound === undefined ? {} : { upperBound }) };
  const encoded = Buffer.from(JSON.stringify(value)).toString("base64url");
  // Validate values returned by storage as well as those received from clients.
  try { decodeCursor(encoded, scope); } catch { throw new RadarError("INTERNAL_ERROR"); }
  return encoded;
}
