import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

import type { AuthenticatedUser } from "../../shared/authenticated-user";
import type { ProfileRepository, UserProfile } from "./profile.types";

const defaultClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const profileKey = (sub: string) => ({ PK: `USER#${sub}`, SK: "PROFILE" });

function toPublic(item: Record<string, unknown>): UserProfile {
  const { userId, email, displayName, defaultMarket, authProviders, createdAt, updatedAt } = item;
  return { userId, email, displayName, defaultMarket, authProviders, createdAt, updatedAt } as UserProfile;
}

export class DynamoDbProfileRepository implements ProfileRepository {
  public constructor(
    private readonly documentClient: DynamoDBDocumentClient = defaultClient,
    private readonly tableName = process.env.USER_DATA_TABLE_NAME,
  ) {}

  public async get(user: AuthenticatedUser): Promise<UserProfile | undefined> {
    const result = await this.documentClient.send(new GetCommand({
      TableName: this.tableName,
      Key: profileKey(user.sub),
      ConsistentRead: true,
    }));
    return result.Item === undefined || result.Item.entityType !== "USER_PROFILE" ? undefined : toPublic(result.Item);
  }

  public async createIfAbsent(user: AuthenticatedUser, profile: UserProfile): Promise<boolean> {
    try {
      await this.documentClient.send(new PutCommand({
        TableName: this.tableName,
        Item: { ...profileKey(user.sub), ...profile, entityType: "USER_PROFILE" },
        ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
      }));
      return true;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "ConditionalCheckFailedException") return false;
      throw error;
    }
  }
}
