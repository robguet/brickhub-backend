import { expect, it, vi } from "vitest";
import type { S3Client } from "@aws-sdk/client-s3";
import { RadarMediaImporter } from "../../../../src/modules/radar/radar-media-import.service";
it("uploads a missing object with the correct MIME and immutable cache header", async () => {
  const send = vi.fn().mockRejectedValueOnce(Object.assign(new Error("missing"), { name: "NotFound" })).mockResolvedValueOnce({});
  await new RadarMediaImporter({ send } as unknown as S3Client, "private-bucket").upload([{ sourcePath: "/images/a.svg", key: "radar/a.svg", bytes: Buffer.from("svg"), contentType: "image/svg+xml", sha256: "a".repeat(64) }]);
  expect(send.mock.calls[1]?.[0].input).toMatchObject({ Bucket: "private-bucket", Key: "radar/a.svg", ContentType: "image/svg+xml", IfNoneMatch: "*", CacheControl: "public,max-age=31536000,immutable" });
});
it("does not overwrite on access failure or mismatched existing content", async () => {
  const object = { sourcePath: "/images/a.svg", key: "radar/a.svg", bytes: Buffer.from("svg"), contentType: "image/svg+xml", sha256: "a".repeat(64) };
  const send = vi.fn().mockRejectedValueOnce(Object.assign(new Error("Denied"), { name: "AccessDenied" }));
  await expect(new RadarMediaImporter({ send } as unknown as S3Client, "bucket").upload([object])).rejects.toThrow(); expect(send).toHaveBeenCalledTimes(1);
  send.mockReset().mockResolvedValue({ Metadata: { sha256: "b" }, ContentType: "image/svg+xml" });
  await expect(new RadarMediaImporter({ send } as unknown as S3Client, "bucket").upload([object])).rejects.toThrow(); expect(send).toHaveBeenCalledTimes(1);
});
