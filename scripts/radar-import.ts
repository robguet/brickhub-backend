import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { parseArgs } from "node:util";
import { DynamoDBClient, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { S3Client, GetBucketLocationCommand } from "@aws-sdk/client-s3";
import { prepareImport, applyImport, type ImportReport } from "../src/modules/radar/radar-import.service";
import { DynamoDbRadarWriter } from "../src/modules/radar/dynamodb-radar.repository";
import { prepareLocalMedia, RadarMediaImporter } from "../src/modules/radar/radar-media-import.service";
import { RadarError } from "../src/modules/radar/radar.http-response";
const options = {
  input: { type: "string" }, report: { type: "string" }, resolutions: { type: "string" },
  "media-base-url": { type: "string" }, "assets-root": { type: "string" }, bucket: { type: "string" },
  apply: { type: "boolean" }, "dry-run": { type: "boolean" }, environment: { type: "string" },
  region: { type: "string" }, table: { type: "string" }, "expected-account": { type: "string" }, publish: { type: "string" },
} as const;
async function main(): Promise<void> {
  const { values } = parseArgs({ options, strict: true, allowPositionals: false });
  if (!values.input || !values.report || (values.apply && values["dry-run"]) || resolve(values.input) === resolve(values.report) || (values.resolutions && resolve(values.resolutions) === resolve(values.report))) throw new RadarError("VALIDATION_ERROR");
  const bytes = await readFile(values.input);
  let manifest: unknown;
  if (values.resolutions) {
    const content = await readFile(values.resolutions, "utf8");
    try { manifest = JSON.parse(content); } catch { manifest = "invalid-json"; }
  }
  let input: unknown;
  try { input = JSON.parse(bytes.toString("utf8")); } catch { input = undefined; }
  const prepared = prepareImport(input, {
    sourceSha256: createHash("sha256").update(bytes).digest("hex"), sourceReference: values.input, manifest,
    mediaBaseUrl: values["media-base-url"], publish: values.publish ? values.publish.split(",") : [],
  });
  let report: ImportReport = prepared.report;
  let media: Awaited<ReturnType<typeof prepareLocalMedia>> = [];
  if (Object.keys(prepared.requiredMedia).length) {
    try {
      if (!values["assets-root"]) throw new Error("assets root");
      media = await prepareLocalMedia(prepared.requiredMedia, values["assets-root"]);
    } catch { report.rejected.push({ path: "media", message: "Los archivos de imagen o sus claves con hash no son válidos." }); report.importReady = false; }
  }
  if (values.apply) {
    report.mode = "apply";
    if (values.environment !== "dev" || !values.region || values.table !== "brickhub-dev-radar" || !values["expected-account"] || !/^\d{12}$/.test(values["expected-account"]) || !values.bucket || !values["media-base-url"]) {
      report.rejected.push({ path: "destination", message: "Apply requiere destino dev explícito, cuenta, región, bucket y URL CDN." }); report.importReady = false;
    }
    if (report.importReady) {
      const region = values.region!;
      const table = values.table!;
      const bucket = values.bucket!;
      const db = new DynamoDBClient({ region });
      const sts = new STSClient({ region });
      const s3 = new S3Client({ region });
      try {
        const identity = await sts.send(new GetCallerIdentityCommand({}), { abortSignal: AbortSignal.timeout(15_000) });
        if (identity.Account !== values["expected-account"]) throw new RadarError("CONFLICT");
        const description = await db.send(new DescribeTableCommand({ TableName: table }), { abortSignal: AbortSignal.timeout(15_000) });
        const expectedArn = `arn:aws:dynamodb:${region}:${identity.Account}:table/${table}`;
        if (description.Table?.TableArn !== expectedArn || description.Table.TableStatus !== "ACTIVE") throw new RadarError("CONFLICT");
        const location = await s3.send(new GetBucketLocationCommand({ Bucket: bucket, ExpectedBucketOwner: identity.Account }), { abortSignal: AbortSignal.timeout(15_000) });
        if ((location.LocationConstraint === "EU" ? "eu-west-1" : location.LocationConstraint || "us-east-1") !== region) throw new RadarError("CONFLICT");
        const writer = new DynamoDbRadarWriter(DynamoDBDocumentClient.from(db, { marshallOptions: { removeUndefinedValues: true } }), table);
        report = await applyImport(prepared, writer, async () => {
          await new RadarMediaImporter(s3, bucket).upload(media);
          for (const object of media) {
            const url = `${values["media-base-url"]!.replace(/\/$/, "")}/${object.key}`;
            const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(15_000) });
            if (!response.ok || response.headers.get("content-type")?.split(";")[0] !== object.contentType) throw new Error("Media delivery unavailable");
          }
        });
      } catch (error) {
        if (error instanceof RadarError && error.code === "CONFLICT") report.conflicts.push({ path: "destination", message: "La identidad o recurso no coincide con el destino aprobado." });
        else report.appliedResults.push({ entityId: "DESTINATION", action: "failed" });
        report.importReady = false;
      } finally { db.destroy(); sts.destroy(); s3.destroy(); }
    }
  }
  await writeFile(values.report, JSON.stringify(report, null, 2) + "\n");
  console.info(JSON.stringify({ importReady: report.importReady, mode: report.mode, counts: report.normalizedCounts, conflicts: report.conflicts.length, rejected: report.rejected.length, report: values.report }));
  process.exitCode = report.appliedResults.some(value => value.action === "failed") ? 1 : report.importReady ? 0 : 2;
}
void main().catch(() => { console.error("No fue posible preparar la importación; revisa argumentos y archivos de entrada."); process.exitCode = 1; });
