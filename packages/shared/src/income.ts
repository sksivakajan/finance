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
// Output type (post-parse: amountMinor is a real bigint) — what backend code
// works with after the ZodValidationPipe has run.
export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;
// Input/wire type (pre-parse: amountMinor is still the digit string) — what a
// client actually sends as JSON, since bigint isn't JSON-serializable.
export type CreateIncomeRequest = z.input<typeof createIncomeSchema>;

export const updateIncomeSchema = createIncomeSchema.partial();
export type UpdateIncomeInput = z.infer<typeof updateIncomeSchema>;
export type UpdateIncomeRequest = z.input<typeof updateIncomeSchema>;
