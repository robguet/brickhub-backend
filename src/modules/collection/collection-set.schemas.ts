import { z } from "zod";

import { collectionConditions } from "./collection-set.types";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value && value <= new Date().toISOString().slice(0, 10);
});
const base = {
  quantity: z.number().int().min(1).max(99),
  condition: z.enum(collectionConditions),
  notes: z.string().trim().max(1000).nullable(),
  acquiredOn: dateSchema.nullable(),
};

export const createCollectionSetSchema = z.object({
  catalogSetId: z.number().int().positive(),
  quantity: base.quantity.default(1),
  condition: base.condition.default("used"),
  notes: base.notes.default(null),
  acquiredOn: base.acquiredOn.default(null),
}).strict();

export const updateCollectionSetSchema = z.object({
  quantity: base.quantity.optional(),
  condition: base.condition.optional(),
  notes: base.notes.optional(),
  acquiredOn: base.acquiredOn.optional(),
}).strict().refine((value) => Object.keys(value).length > 0);

export const collectionSetIdSchema = z.uuid();
export const listCollectionSetSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().max(2048).optional(),
}).strict();
