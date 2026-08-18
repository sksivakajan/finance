import { z } from "zod";
import { amountMinorSchema, currencySchema, recurrenceFrequencySchema } from "./money.js";

export const createIncomeSchema = z.object({
  amountMinor: amountMinorSchema,
  currency: currencySchema,
  categoryId: z.string().min(1).optional(),
  source: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  date: z.coerce.date(),
  isRecurring: z.boolean().default(false),
  recurrenceRule: recurrenceFrequencySchema.optional(),
  attachmentUrl: z.string().trim().url().optional(),
  notes: z.string().trim().max(1000).optional(),
});
export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;

export const updateIncomeSchema = createIncomeSchema.partial();
export type UpdateIncomeInput = z.infer<typeof updateIncomeSchema>;
