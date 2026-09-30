export interface BricksetCredentials {
  apiKey: string;
  userHash: string;
}

export interface SetSearchQuery {
  query: string;
  pageNumber: number;
  pageSize: number;
}

export interface BricksetSet {
  setID?: number;
  number?: string;
  numberVariant?: number;
  name?: string;
  year?: number;
  theme?: string;
  themeGroup?: string;
  subtheme?: string | null;
  category?: string;
  released?: boolean;
  pieces?: number | null;
  minifigs?: number | null;
  launchDate?: string | null;
  exitDate?: string | null;
  image?: { thumbnailURL?: string; imageURL?: string } | null;
  bricksetURL?: string;
  collection?: Record<string, unknown> | null;
  collections?: Record<string, unknown> | null;
  LEGOCom?: Record<string, LegoComAvailability> | null;
  rating?: number | null;
  ratingCount?: number | null;
  reviewCount?: number | null;
  packagingType?: string | null;
  availability?: string | null;
  instructionsCount?: number | null;
  additionalImageCount?: number | null;
  ageRange?: Record<string, unknown> | null;
  dimensions?: Record<string, unknown> | null;
  modelDimensions?: Record<string, unknown> | null;
  barcode?: Record<string, unknown> | null;
  itemNumber?: Record<string, unknown> | null;
  extendedData?: Record<string, unknown> | null;
  lastUpdated?: string | null;
  [key: string]: unknown;
}

export interface LegoComAvailability {
  retailPrice?: number | null;
  dateFirstAvailable?: string | null;
  dateLastAvailable?: string | null;
}

export interface SetSearchResult {
  status: "success";
  matches: number;
  sets: BricksetSet[];
}

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UPSTREAM_RATE_LIMITED"
  | "UPSTREAM_UNAVAILABLE"
  | "UPSTREAM_INVALID_RESPONSE";

export interface ErrorResponse {
  status: "error";
  code: ErrorCode;
  message: string;
}

export class SearchError extends Error {
  public constructor(
    public readonly code: ErrorCode,
    public readonly statusCode: 400 | 429 | 502,
    message: string,
  ) {
    super(message);
    this.name = "SearchError";
  }
}

export interface BricksetCatalog {
  search(query: SetSearchQuery): Promise<SetSearchResult>;
}
