import type { AmazonOffer, AmazonOfferRepository } from "./amazon-offer.types";

export class GetAmazonOffersService {
  public constructor(private readonly repository: AmazonOfferRepository) {}
  public list(): Promise<AmazonOffer[]> { return this.repository.list(); }
}
