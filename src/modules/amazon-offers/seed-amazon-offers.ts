import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { CloudFormationCustomResourceEvent } from "aws-lambda";

import { AMAZON_OFFER_ENTITY_TYPE, AMAZON_OFFERS_PK, type AmazonOfferCard } from "./amazon-offer.types";

const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const initialOffers: ReadonlyArray<Omit<AmazonOfferCard, "PK" | "SK" | "entityType" | "isAvailable">> = [
  { amazonOfferId: "lord-of-the-rings", position: 1, title: "LEGO Señor de los Anillos", discount: "hasta 22%", url: "https://www.amazon.com.mx/shop/robguetstudios/list/X3WXTWMAYNAM?ref_=aipsflist", image: "https://m.media-amazon.com/images/I/51gw0UWtBJL._AC_.jpg" },
  { amazonOfferId: "star-wars", position: 2, title: "Promociones Star Wars", discount: "20%, 30% y más", url: "https://www.amazon.com.mx/shop/robguetstudios/list/2BYYTGJR5PBWR?ref_=aipsflist", image: "/images/home/amazon-offers/star-wars.png" },
  { amazonOfferId: "marvel", position: 3, title: "Descuentos Marvel", discount: "hasta 30%", url: "https://www.amazon.com.mx/shop/robguetstudios/list/300N3SHRJVVQT?ref_=aipsflist", image: "/images/home/amazon-offers/marvel.png" },
  { amazonOfferId: "speed-champions", position: 4, title: "Descuentos Speed Champions", discount: "hasta 30%", url: "https://www.amazon.com.mx/shop/robguetstudios/list/27T66WQIKQ2FA?ref_=aipsflist", image: "/images/home/amazon-offers/speed-champions.png" },
  { amazonOfferId: "retiring-soon", position: 5, title: "Próximos a descontinuar", discount: "hasta 27%", url: "https://www.amazon.com.mx/shop/robguetstudios/list/2BCWC7BLW6D1L?ref_=aipsflist", image: "/images/home/amazon-offers/proximos-a-descontinuar.png" },
];

function card(offer: (typeof initialOffers)[number]): AmazonOfferCard {
  return { PK: AMAZON_OFFERS_PK, SK: `AVAILABLE#${String(offer.position).padStart(6, "0")}#${offer.amazonOfferId}`, entityType: AMAZON_OFFER_ENTITY_TYPE, isAvailable: true, ...offer };
}

async function respond(event: CloudFormationCustomResourceEvent, status: "SUCCESS" | "FAILED", reason?: string): Promise<void> {
  const physicalResourceId = "PhysicalResourceId" in event ? event.PhysicalResourceId : undefined;
  const body = JSON.stringify({ Status: status, Reason: reason ?? "See CloudWatch Logs", PhysicalResourceId: physicalResourceId ?? "amazon-offer-catalog-seed-v1", StackId: event.StackId, RequestId: event.RequestId, LogicalResourceId: event.LogicalResourceId, Data: {} });
  await fetch(event.ResponseURL, { method: "PUT", headers: { "content-type": "", "content-length": String(Buffer.byteLength(body)) }, body });
}

export async function handler(event: CloudFormationCustomResourceEvent): Promise<void> {
  try {
    if (event.RequestType !== "Delete") {
      const tableName = process.env.AMAZON_OFFER_CARDS_TABLE_NAME;
      if (!tableName) throw new Error("Missing Amazon offers table name");
      for (const item of initialOffers.map(card)) {
        try { await documentClient.send(new PutCommand({ TableName: tableName, Item: item, ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)" })); }
        catch (error: unknown) { if (!(error instanceof Error) || error.name !== "ConditionalCheckFailedException") throw error; }
      }
    }
    await respond(event, "SUCCESS");
  } catch {
    await respond(event, "FAILED", "Unable to initialize Amazon offer cards.");
    throw new Error("Amazon offer catalog seed failed");
  }
}

export { initialOffers };
