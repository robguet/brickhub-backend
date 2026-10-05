export const AMAZON_OFFERS_PK = "CATALOG#AMAZON_OFFERS";
export const AMAZON_OFFER_ENTITY_TYPE = "AMAZON_OFFER_CARD";

export interface AmazonOffer {
  title: string;
  discount: string;
  url: string;
  image: string;
}

export interface AmazonOfferCard extends AmazonOffer {
  PK: string;
  SK: string;
  entityType: string;
  amazonOfferId: string;
  position: number;
  isAvailable: boolean;
}

export interface AmazonOfferRepository {
  list(): Promise<AmazonOffer[]>;
}
