import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
const template = readFileSync("template.yaml", "utf8");
it("protects all Radar routes and keeps HTTP Lambda read-only", () => {
  const functionDefinition = template.split("  RadarFunction:\n")[1]?.split("  RadarFunctionLogGroup:\n")[0] ?? "";
  expect(functionDefinition.match(/Authorizer: CognitoJwtAuthorizer/g)).toHaveLength(6);
  expect(functionDefinition).not.toContain("TransactWriteItems"); expect(functionDefinition).not.toContain("s3:PutObject");
  expect(functionDefinition).toContain("dynamodb:TransactGetItems");
});
it("keeps S3 private and delegates reads to only the declared CloudFront distribution", () => {
  const bucket = template.split("  RadarMediaBucket:\n")[1]?.split("  RadarMediaOriginAccessControl:\n")[0] ?? "";
  expect(bucket).toContain("BlockPublicPolicy: true"); expect(bucket).toContain("RestrictPublicBuckets: true");
  const policy = template.split("  RadarMediaBucketPolicy:\n")[1]?.split("  RadarImportPolicy:\n")[0] ?? "";
  expect(policy).toContain("Service: cloudfront.amazonaws.com"); expect(policy).toContain("AWS:SourceArn:"); expect(policy).toContain("distribution/${RadarMediaDistribution}");
});
