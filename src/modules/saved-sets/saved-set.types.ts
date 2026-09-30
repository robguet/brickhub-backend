import type { AuthenticatedUser } from "../../shared/authenticated-user";

export const savedSetDestinations = ["collection", "wishlist"] as const;
export type SavedSetDestination = (typeof savedSetDestinations)[number];

export interface SetImage {
  thumbnailURL: string;
  imageURL: string;
}

export interface Barcode {
  EAN: string;
}

export interface SetSnapshotInput {
  setID: number;
  number: string;
  numberVariant: number;
  name: string;
  year: number;
  theme: string;
  subtheme?: string;
  category: string;
  released: boolean;
  pieces: number;
  launchDate?: string;
  exitDate?: string;
  image?: SetImage;
  bricksetURL?: string;
  rating?: number;
  ratingCount?: number;
  reviewCount?: number;
  packagingType?: string;
  barcode?: Barcode;
  lastUpdated?: string;
}

export interface SaveUserSetInput {
  destination: SavedSetDestination;
  set: SetSnapshotInput;
}

export interface SavedSet {
  destination: SavedSetDestination;
  set: SetSnapshotInput;
  createdAt: string;
  updatedAt: string;
}

export interface SaveResult {
  savedSet: SavedSet;
  created: boolean;
}

export interface SavedSetRepository {
  save(user: AuthenticatedUser, savedSet: SavedSet): Promise<SaveResult>;
}
