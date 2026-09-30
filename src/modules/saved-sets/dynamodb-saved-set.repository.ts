import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

import type { AuthenticatedUser } from "../../shared/authenticated-user";
import { savedSetDestinations, type SaveResult, type SavedSet, type SavedSetRepository, type SavedSetsList } from "./saved-set.types";

const defaultClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function key(sub: string, setID: number): Record<string, string> {
  return { PK: `USER#${sub}`, SK: `SAVED_SET#${setID}` };
}

function toSavedSet(item: Record<string, unknown>): SavedSet | undefined {
  const { destination, set, createdAt, updatedAt } = item;
  if (
    item.entityType !== "SAVED_SET"
    || !savedSetDestinations.includes(destination as (typeof savedSetDestinations)[number])
    || typeof set !== "object" || set === null
    || typeof createdAt !== "string" || typeof updatedAt !== "string"
  ) return undefined;
  return { destination: destination as SavedSet["destination"], set: set as SavedSet["set"], createdAt, updatedAt };
}

export class DynamoDbSavedSetRepository implements SavedSetRepository {
  public constructor(
    private readonly documentClient: DynamoDBDocumentClient = defaultClient,
    private readonly tableName = process.env.USER_DATA_TABLE_NAME,
  ) {}

  public async list(user: AuthenticatedUser): Promise<SavedSetsList> {
    const savedSets: SavedSetsList = { collection: [], wishlist: [] };
    let exclusiveStartKey: Record<string, string> | undefined;
    do {
      const result = await this.documentClient.send(new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: { ":pk": `USER#${user.sub}`, ":prefix": "SAVED_SET#" },
        ...(exclusiveStartKey === undefined ? {} : { ExclusiveStartKey: exclusiveStartKey }),
      }));
      for (const item of result.Items ?? []) {
        const savedSet = toSavedSet(item);
        if (savedSet !== undefined) savedSets[savedSet.destination].push(savedSet);
      }
      const lastKey = result.LastEvaluatedKey;
      exclusiveStartKey = typeof lastKey?.PK === "string" && typeof lastKey.SK === "string"
        ? { PK: lastKey.PK, SK: lastKey.SK }
        : undefined;
    } while (exclusiveStartKey !== undefined);
    return savedSets;
  }

  public async save(user: AuthenticatedUser, savedSet: SavedSet): Promise<SaveResult> {
    const item = {
      ...key(user.sub, savedSet.set.setID),
      ...savedSet,
      entityType: "SAVED_SET",
    };
    try {
      await this.documentClient.send(new PutCommand({
        TableName: this.tableName,
        Item: item,
        ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
      }));
      return { savedSet, created: true };
    } catch (error: unknown) {
      if (!(error instanceof Error) || error.name !== "ConditionalCheckFailedException") throw error;
    }

    const existing = await this.documentClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: key(user.sub, savedSet.set.setID),
      UpdateExpression: "SET destination = :destination, #set = :set, updatedAt = :updatedAt",
      ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK) AND entityType = :entityType",
      ExpressionAttributeNames: { "#set": "set" },
      ExpressionAttributeValues: {
        ":destination": savedSet.destination,
        ":set": savedSet.set,
        ":updatedAt": savedSet.updatedAt,
        ":entityType": "SAVED_SET",
      },
      ReturnValues: "ALL_NEW",
    }));
    if (existing.Attributes === undefined || existing.Attributes.entityType !== "SAVED_SET") throw new Error("SAVED_SET_CONFLICT_UPDATE_FAILED");
    const updated = toSavedSet(existing.Attributes);
    if (updated === undefined) throw new Error("SAVED_SET_CONFLICT_UPDATE_FAILED");
    return { savedSet: updated, created: false };
  }
}
