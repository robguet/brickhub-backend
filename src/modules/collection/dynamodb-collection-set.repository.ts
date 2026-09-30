import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

import type { AuthenticatedUser } from "../../shared/authenticated-user";
import type { CollectionPage, CollectionSet, CollectionSetRepository, UpdateCollectionSetInput } from "./collection-set.types";

const defaultClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function key(sub: string, id: string): Record<string, string> { return { PK: `USER#${sub}`, SK: `SET#${id}` }; }
function encodeCursor(id: string): string { return Buffer.from(JSON.stringify({ v: 1, id })).toString("base64url"); }
function decodeCursor(cursor: string): string {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (typeof parsed === "object" && parsed !== null && "v" in parsed && "id" in parsed && (parsed as { v: unknown }).v === 1 && typeof (parsed as { id: unknown }).id === "string") return (parsed as { id: string }).id;
  } catch { /* converted below */ }
  throw new Error("INVALID_CURSOR");
}
function toPublic(item: Record<string, unknown>): CollectionSet {
  const { collectionSetId, catalogSetId, quantity, condition, notes, acquiredOn, createdAt, updatedAt } = item;
  return { collectionSetId, catalogSetId, quantity, condition, notes, acquiredOn, createdAt, updatedAt } as CollectionSet;
}

export class DynamoDbCollectionSetRepository implements CollectionSetRepository {
  public constructor(
    private readonly documentClient: DynamoDBDocumentClient = defaultClient,
    private readonly tableName = process.env.USER_DATA_TABLE_NAME,
  ) {}

  public async list(user: AuthenticatedUser, limit: number, cursor?: string): Promise<CollectionPage> {
    const startId = cursor === undefined ? undefined : decodeCursor(cursor);
    const result = await this.documentClient.send(new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: { ":pk": `USER#${user.sub}`, ":prefix": "SET#" },
      Limit: limit,
      ScanIndexForward: false,
      ...(startId === undefined ? {} : { ExclusiveStartKey: key(user.sub, startId) }),
    }));
    const last = result.LastEvaluatedKey?.SK;
    return { items: (result.Items ?? []).map(toPublic), page: { limit, nextCursor: typeof last === "string" ? encodeCursor(last.replace("SET#", "")) : null } };
  }

  public async create(user: AuthenticatedUser, set: CollectionSet): Promise<CollectionSet> {
    const item = { ...key(user.sub, set.collectionSetId), ...set, entityType: "COLLECTION_SET", destination: "collection" };
    try {
      await this.documentClient.send(new PutCommand({ TableName: this.tableName, Item: item, ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)" }));
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "ConditionalCheckFailedException") throw new Error("COLLECTION_CONFLICT");
      throw error;
    }
    return set;
  }

  public async update(user: AuthenticatedUser, id: string, input: UpdateCollectionSetInput): Promise<CollectionSet | undefined> {
    const fields = Object.entries(input);
    const names: Record<string, string> = { "#type": "entityType", "#updatedAt": "updatedAt" };
    const values: Record<string, unknown> = { ":type": "COLLECTION_SET", ":updatedAt": new Date().toISOString() };
    const clauses = fields.map(([field], index) => { names[`#f${index}`] = field; values[`:v${index}`] = input[field as keyof UpdateCollectionSetInput]; return `#f${index} = :v${index}`; });
    try {
      const result = await this.documentClient.send(new UpdateCommand({ TableName: this.tableName, Key: key(user.sub, id), UpdateExpression: `SET ${[...clauses, "#updatedAt = :updatedAt"].join(", ")}`, ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK) AND #type = :type", ExpressionAttributeNames: names, ExpressionAttributeValues: values, ReturnValues: "ALL_NEW" }));
      return result.Attributes === undefined ? undefined : toPublic(result.Attributes);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "ConditionalCheckFailedException") return undefined;
      throw error;
    }
  }

  public async delete(user: AuthenticatedUser, id: string): Promise<boolean> {
    try {
      await this.documentClient.send(new DeleteCommand({ TableName: this.tableName, Key: key(user.sub, id), ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK) AND entityType = :type", ExpressionAttributeValues: { ":type": "COLLECTION_SET" } }));
      return true;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "ConditionalCheckFailedException") return false;
      throw error;
    }
  }
}
