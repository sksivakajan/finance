import { z } from "zod";
import { amountMinorSchema, currencySchema, recurrenceFrequencySchema } from "./money.js";

// Phase 1: personal expenses only (splitMethod=NONE implicitly — the payer is
// always the owner). Shared-expense fields (participants, splits, items,
// visibility) land with the Phase 3 migration per docs/BLUEPRINT.md §16.
export const createExpenseSchema = z.object({
  amountMinor: amountMinorSchema,
  currency: currencySchema,
  categoryId: z.string().min(1).optional(),
  merchant: z.string().trim().max(100).optional(),
  description: z.string().trim().max(500).optional(),
  date: z.coerce.date(),
  paymentMethod: z.string().trim().max(50).optional(),
  attachmentUrl: z.string().trim().url().optional(),
  notes: z.string().trim().max(1000).optional(),
  isRecurring: z.boolean().default(false),
  recurrenceRule: recurrenceFrequencySchema.optional(),
});
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type CreateExpenseRequest = z.input<typeof createExpenseSchema>;

export const updateExpenseSchema = createExpenseSchema.partial();
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type UpdateExpenseRequest = z.input<typeof updateExpenseSchema>;
