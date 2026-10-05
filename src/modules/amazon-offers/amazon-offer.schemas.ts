import { z } from "zod";

import { AMAZON_OFFER_ENTITY_TYPE, AMAZON_OFFERS_PK, type AmazonOffer, type AmazonOfferCard } from "./amazon-offer.types";

function isSafeHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.length > 0 && url.username === "" && url.password === "";
  } catch { return false; }
}

const requiredText = z.string().trim().min(1);
const safeHttpsUrl = requiredText.refine(isSafeHttpsUrl, "Expected an HTTPS URL without credentials");
const imageReference = requiredText.refine(value => value.startsWith("/") || isSafeHttpsUrl(value), "Expected an HTTPS URL or a local path");

export const amazonOfferCardSchema = z.object({
  PK: z.literal(AMAZON_OFFERS_PK),
  SK: z.string().min(1),
  entityType: z.literal(AMAZON_OFFER_ENTITY_TYPE),
  amazonOfferId: requiredText,
  position: z.number().int().positive(),
  isAvailable: z.literal(true),
  title: requiredText,
  discount: requiredText,
  url: safeHttpsUrl,
  image: imageReference,
}).strict().superRefine((card, context) => {
  const expected = `AVAILABLE#${String(card.position).padStart(6, "0")}#${card.amazonOfferId}`;
  if (card.SK !== expected) context.addIssue({ code: "custom", message: "The availability key is inconsistent." });
});

export function parseAmazonOfferCard(value: unknown): AmazonOfferCard {
  return amazonOfferCardSchema.parse(value);
}

export function toPublicAmazonOffer(card: AmazonOfferCard): AmazonOffer {
  return { title: card.title, discount: card.discount, url: card.url, image: card.image };
}
