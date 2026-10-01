import { z } from "zod";

import { savedSetDestinations } from "./saved-set.types";

const timestampSchema = z.string().refine(
  (value) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value) && !Number.isNaN(Date.parse(value)),
  "Debe ser una fecha ISO 8601 UTC.",
);
const httpsUrlSchema = z.url().refine((value) => value.startsWith("https://"), "Debe ser una URL HTTPS.");
const nonEmpty = (max: number) => z.string().trim().min(1).max(max);
const legoComAvailabilitySchema = z.object({
  retailPrice: z.number().nonnegative().optional(),
  dateFirstAvailable: timestampSchema.optional(),
  dateLastAvailable: timestampSchema.optional(),
}).strict();

export const setSnapshotSchema = z.object({
  setID: z.number().int().positive(),
  number: nonEmpty(64),
  numberVariant: z.number().int().nonnegative(),
  name: nonEmpty(500),
  year: z.number().int().min(1949).max(2100),
  theme: nonEmpty(200),
  subtheme: nonEmpty(200).optional(),
  category: nonEmpty(100),
  released: z.boolean(),
  pieces: z.number().int().nonnegative(),
  launchDate: timestampSchema.optional(),
  exitDate: timestampSchema.optional(),
  image: z.object({ thumbnailURL: httpsUrlSchema, imageURL: httpsUrlSchema }).strict().optional(),
  bricksetURL: httpsUrlSchema.optional(),
  rating: z.number().min(0).max(5).optional(),
  ratingCount: z.number().int().nonnegative().optional(),
  reviewCount: z.number().int().nonnegative().optional(),
  packagingType: nonEmpty(100).optional(),
  barcode: z.object({ EAN: z.string().regex(/^\d{8,14}$/) }).strict().optional(),
  LEGOCom: z.record(z.string().regex(/^[A-Z]{2}$/), legoComAvailabilitySchema).optional(),
  lastUpdated: timestampSchema.optional(),
}).strict();

export const saveUserSetSchema = z.object({
  destination: z.enum(savedSetDestinations),
  set: setSnapshotSchema,
}).strict();

export const savedSetIdSchema = z.coerce.number().int().positive();
