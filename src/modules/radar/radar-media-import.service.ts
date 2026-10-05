import { createHash } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import { resolve, relative, extname } from "node:path";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { mediaKeySchema } from "./radar-import.schemas";
import { RadarError } from "./radar.http-response";
const contentTypes: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".avif": "image/avif", ".gif": "image/gif" };
export interface LocalMedia { sourcePath: string; key: string; bytes: Buffer; contentType: string; sha256: string; }
export async function prepareLocalMedia(mapping: Record<string, string>, assetsRoot: string): Promise<LocalMedia[]> {
  const root = await realpath(assetsRoot);
  const objects: LocalMedia[] = [];
  const keys = new Set<string>();
  for (const [sourcePath, objectKey] of Object.entries(mapping)) {
    mediaKeySchema.parse(objectKey);
    if (!sourcePath.startsWith("/images/")) throw new RadarError("VALIDATION_ERROR");
    const path = await realpath(resolve(root, `.${sourcePath}`));
    const local = relative(root, path);
    if (local.startsWith("..") || local.startsWith("/")) throw new RadarError("VALIDATION_ERROR");
    const contentType = contentTypes[extname(path).toLowerCase()];
    if (!contentType || extname(path).toLowerCase() !== extname(objectKey).toLowerCase()) throw new RadarError("VALIDATION_ERROR");
    const info = await stat(path);
    if (!info.isFile() || info.size > 10 * 1024 * 1024) throw new RadarError("VALIDATION_ERROR");
    const bytes = await readFile(path);
    if (!bytes.length || bytes.byteLength > 10 * 1024 * 1024) throw new RadarError("VALIDATION_ERROR");
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    // Immutable object keys prevent an image update from silently changing old posts/cache.
    if (!objectKey.includes(sha256)) throw new RadarError("VALIDATION_ERROR");
    if (!keys.has(objectKey)) objects.push({ sourcePath, key: objectKey, bytes, contentType, sha256 });
    keys.add(objectKey);
  }
  return objects;
}
export class RadarMediaImporter {
  public constructor(private readonly client: Pick<S3Client, "send">, private readonly bucket: string) {}
  public async upload(objects: LocalMedia[]): Promise<void> {
    for (const object of objects) {
      let exists = false;
      try {
        const current = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: object.key }), { abortSignal: AbortSignal.timeout(15_000) });
        if (current.Metadata?.sha256 !== object.sha256 || current.ContentType !== object.contentType) throw new RadarError("CONFLICT");
        exists = true;
      } catch (error) {
        // Only absence permits upload; access/network failures must not cause overwrites.
        if (!(error instanceof Error && (error.name === "NotFound" || error.name === "NoSuchKey"))) throw error;
      }
      if (!exists) await this.client.send(new PutObjectCommand({
        Bucket: this.bucket, Key: object.key, Body: object.bytes, ContentType: object.contentType,
        CacheControl: "public,max-age=31536000,immutable", Metadata: { sha256: object.sha256 }, IfNoneMatch: "*",
      }), { abortSignal: AbortSignal.timeout(15_000) });
    }
  }
}
