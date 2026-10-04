import { ShoppingError } from "./shopping.types";
const MAX_UPSTREAM_BYTES = 4 * 1024 * 1024;
const credentialParameters = new Set(["token", "apikey", "api_key", "scrape_do_api_key", "authorization", "password", "access_token"]);
export async function readPayload(response: Response, signal: AbortSignal): Promise<unknown> {
  if (!response.body) throw new ShoppingError("UPSTREAM_INVALID_RESPONSE", 502);
  const reader = response.body.getReader();
  const cancel = (): void => { void reader.cancel().catch(() => undefined); };
  signal.addEventListener("abort", cancel, { once: true });
  let completed = false;
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      if (signal.aborted) throw new ShoppingError("UPSTREAM_UNAVAILABLE", 502);
      const chunk = await reader.read();
      if (signal.aborted) throw new ShoppingError("UPSTREAM_UNAVAILABLE", 502);
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_UPSTREAM_BYTES) throw new ShoppingError("UPSTREAM_RESPONSE_TOO_LARGE", 502);
      chunks.push(chunk.value);
    }
    completed = true;
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
      const payload: unknown = JSON.parse(text);
      return payload;
    } catch { throw new ShoppingError("UPSTREAM_INVALID_RESPONSE", 502); }
  } finally {
    signal.removeEventListener("abort", cancel);
    if (!completed) cancel();
    reader.releaseLock();
  }
}

export function safeProductUrl(value: string): string {
  const url = new URL(value);
  if (url.username || url.password || !["http:", "https:"].includes(url.protocol)) throw new ShoppingError("UPSTREAM_INVALID_RESPONSE", 502);
  let changed = false;
  for (const key of [...url.searchParams.keys()]) {
    if (credentialParameters.has(key.toLowerCase())) { url.searchParams.delete(key); changed = true; }
  }
  // Preserve the original URL when no redaction is necessary.
  return changed ? url.toString() : value;
}
export function reflectsSecret(value: unknown, apiKey: string): boolean {
  if (typeof value === "string") {
    if (value.includes(apiKey)) return true;
    try { return decodeURIComponent(value).includes(apiKey); } catch { return false; }
  }
  if (Array.isArray(value)) return value.some(item => reflectsSecret(item, apiKey));
  if (value !== null && typeof value === "object") return Object.entries(value).some(([key, item]) => reflectsSecret(key, apiKey) || reflectsSecret(item, apiKey));
  return false;
}
export function hasProviderError(payload: unknown): boolean {
  if (payload === null || typeof payload !== "object" || !("error" in payload)) return false;
  const error: unknown = payload.error;
  return error !== null && error !== undefined && error !== "" && error !== false;
}

