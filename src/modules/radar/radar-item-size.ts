import { RadarError } from "./radar.http-response";
function valueSize(value: unknown): number {
  if (value === null || typeof value === "boolean") return 1;
  if (typeof value === "string") return Buffer.byteLength(value, "utf8");
  // Text length is a conservative upper bound for DynamoDB packed numbers.
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(21, Buffer.byteLength(String(value)));
  if (Array.isArray(value)) return 3 + value.reduce((total, item) => total + 1 + valueSize(item), 0);
  if (typeof value === "object" && value !== null) return 3 + Object.entries(value).reduce((total, [key, item]) => total + Buffer.byteLength(key) + 1 + valueSize(item), 0);
  throw new RadarError("VALIDATION_ERROR");
}
export function itemSize(item: Record<string, unknown>): number {
  return Object.entries(item).reduce((total, [key, value]) => total + Buffer.byteLength(key) + valueSize(value), 0);
}
export function assertItemSize(item: Record<string, unknown>, budget = 350 * 1024): void {
  if (itemSize(item) > Math.min(budget, 350 * 1024)) throw new RadarError("VALIDATION_ERROR");
}
