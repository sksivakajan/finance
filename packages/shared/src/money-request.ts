import { z } from "zod";
import { amountMinorSchema, currencySchema } from "./money.js";

export const createMoneyRequestSchema = z.object({
  receiverId: z.string().min(1),
  amountMinor: amountMinorSchema,
  currency: currencySchema,
  reason: z.string().trim().min(1).max(280),
  dueDate: z.coerce.date().optional(),
  relatedExpenseId: z.string().min(1).optional(),
});
export type CreateMoneyRequestInput = z.infer<typeof createMoneyRequestSchema>;
export type CreateMoneyRequestRequest = z.input<typeof createMoneyRequestSchema>;
