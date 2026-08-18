import { z } from "zod";
import { amountMinorSchema, currencySchema, recurrenceFrequencySchema } from "./money.js";

export const scheduledPaymentStatusSchema = z.enum(["UPCOMING", "DUE", "PAID", "OVERDUE", "CANCELLED"]);
export type ScheduledPaymentStatus = z.infer<typeof scheduledPaymentStatusSchema>;

// Reminder offsets are days-before-due (0 = on the due date), per
// docs/BLUEPRINT.md §13's "7 days before / 3 days before / 1 day before / on
// due date" examples.
export const createScheduledPaymentSchema = z.object({
  name: z.string().trim().min(1).max(100),
  amountMinor: amountMinorSchema,
  currency: currencySchema,
  categoryId: z.string().min(1).optional(),
  dueDate: z.coerce.date(),
  recurrence: recurrenceFrequencySchema.default("NONE"),
  notes: z.string().trim().max(1000).optional(),
  reminderOffsetDays: z.array(z.number().int().min(0).max(90)).max(10).default([7, 3, 1, 0]),
});
export type CreateScheduledPaymentInput = z.infer<typeof createScheduledPaymentSchema>;

export const updateScheduledPaymentSchema = createScheduledPaymentSchema
  .omit({ reminderOffsetDays: true })
  .partial();
export type UpdateScheduledPaymentInput = z.infer<typeof updateScheduledPaymentSchema>;
