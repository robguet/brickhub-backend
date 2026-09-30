import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

import type { AuthenticatedUser } from "../../shared/authenticated-user";
import type { SaveResult, SavedSet, SavedSetRepository } from "./saved-set.types";

const defaultClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function key(sub: string, setID: number): Record<string, string> {
  return { PK: `USER#${sub}`, SK: `SAVED_SET#${setID}` };
}

function toSavedSet(item: Record<string, unknown>): SavedSet {
  const { destination, set, createdAt, updatedAt } = item;
  return { destination, set, createdAt, updatedAt } as SavedSet;
}

export class DynamoDbSavedSetRepository implements SavedSetRepository {
  public constructor(
    private readonly documentClient: DynamoDBDocumentClient = defaultClient,
    private readonly tableName = process.env.USER_DATA_TABLE_NAME,
  ) {}

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
    return { savedSet: toSavedSet(existing.Attributes), created: false };
  }
}
