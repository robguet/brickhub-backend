import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

import { AMAZON_OFFERS_PK, type AmazonOffer, type AmazonOfferRepository } from "./amazon-offer.types";
import { parseAmazonOfferCard, toPublicAmazonOffer } from "./amazon-offer.schemas";

const defaultClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const MAX_OFFERS = 100;

export class DynamoDbAmazonOfferRepository implements AmazonOfferRepository {
  public constructor(private readonly documentClient: DynamoDBDocumentClient = defaultClient, private readonly tableName = process.env.AMAZON_OFFER_CARDS_TABLE_NAME) {}

  public async list(): Promise<AmazonOffer[]> {
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        this.listWithinDeadline(),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("AMAZON_OFFER_READ_TIMEOUT")), 4_000); }),
      ]);
    } finally { if (timer !== undefined) clearTimeout(timer); }
  }

  private async listWithinDeadline(): Promise<AmazonOffer[]> {
    if (!this.tableName) throw new Error("AMAZON_OFFER_CARDS_TABLE_NAME is required");
    const offers: AmazonOffer[] = [];
    let startKey: Record<string, unknown> | undefined;
    do {
      const result = await this.documentClient.send(new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: { ":pk": AMAZON_OFFERS_PK, ":prefix": "AVAILABLE#" },
        ScanIndexForward: true,
        ...(startKey === undefined ? {} : { ExclusiveStartKey: startKey }),
      }));
      for (const item of result.Items ?? []) {
        if (offers.length >= MAX_OFFERS) throw new Error("AMAZON_OFFER_LIMIT_EXCEEDED");
        offers.push(toPublicAmazonOffer(parseAmazonOfferCard(item)));
      }
      startKey = result.LastEvaluatedKey;
    } while (startKey !== undefined);
    return offers;
  }
}
