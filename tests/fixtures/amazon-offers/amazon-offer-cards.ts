import { AMAZON_OFFER_ENTITY_TYPE, AMAZON_OFFERS_PK, type AmazonOfferCard } from "../../../src/modules/amazon-offers/amazon-offer.types";

export function card(position: number, amazonOfferId: string, overrides: Partial<AmazonOfferCard> = {}): AmazonOfferCard {
  return { PK: AMAZON_OFFERS_PK, SK: `AVAILABLE#${String(position).padStart(6, "0")}#${amazonOfferId}`, entityType: AMAZON_OFFER_ENTITY_TYPE, amazonOfferId, position, isAvailable: true, title: `Oferta ${position}`, discount: "hasta 20%", url: `https://www.amazon.com.mx/list/${amazonOfferId}`, image: `/images/${amazonOfferId}.png`, ...overrides };
}

export const initialCards = [
  card(1, "lord-of-the-rings", { title: "LEGO Señor de los Anillos", discount: "hasta 22%", url: "https://www.amazon.com.mx/shop/robguetstudios/list/X3WXTWMAYNAM?ref_=aipsflist", image: "https://m.media-amazon.com/images/I/51gw0UWtBJL._AC_.jpg" }),
  card(2, "star-wars", { title: "Promociones Star Wars", discount: "20%, 30% y más", url: "https://www.amazon.com.mx/shop/robguetstudios/list/2BYYTGJR5PBWR?ref_=aipsflist", image: "/images/home/amazon-offers/star-wars.png" }),
  card(3, "marvel", { title: "Descuentos Marvel", discount: "hasta 30%", url: "https://www.amazon.com.mx/shop/robguetstudios/list/300N3SHRJVVQT?ref_=aipsflist", image: "/images/home/amazon-offers/marvel.png" }),
  card(4, "speed-champions", { title: "Descuentos Speed Champions", discount: "hasta 30%", url: "https://www.amazon.com.mx/shop/robguetstudios/list/27T66WQIKQ2FA?ref_=aipsflist", image: "/images/home/amazon-offers/speed-champions.png" }),
  card(5, "retiring-soon", { title: "Próximos a descontinuar", discount: "hasta 27%", url: "https://www.amazon.com.mx/shop/robguetstudios/list/2BCWC7BLW6D1L?ref_=aipsflist", image: "/images/home/amazon-offers/proximos-a-descontinuar.png" }),
];
