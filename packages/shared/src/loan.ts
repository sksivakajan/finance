import { z } from "zod";
import { amountMinorSchema, currencySchema, recurrenceFrequencySchema } from "./money.js";

export const loanDirectionSchema = z.enum(["I_OWE", "OWED_TO_ME"]);
export type LoanDirection = z.infer<typeof loanDirectionSchema>;

export const loanStatusSchema = z.enum(["ACTIVE", "PAID_OFF", "DEFAULTED", "CANCELLED"]);
export type LoanStatus = z.infer<typeof loanStatusSchema>;

export const createLoanSchema = z.object({
  direction: loanDirectionSchema,
  counterpartyName: z.string().trim().min(1).max(100),
  principalMinor: amountMinorSchema,
  currency: currencySchema,
  interestRateBps: z.number().int().min(0).max(10000).optional(),
  startDate: z.coerce.date(),
  notes: z.string().trim().max(1000).optional(),
  schedule: z
    .object({
      installmentMinor: amountMinorSchema,
      frequency: recurrenceFrequencySchema,
      nextDueDate: z.coerce.date(),
    })
    .optional(),
});
export type CreateLoanInput = z.infer<typeof createLoanSchema>;

export const updateLoanSchema = z.object({
  counterpartyName: z.string().trim().min(1).max(100).optional(),
  interestRateBps: z.number().int().min(0).max(10000).optional(),
  status: loanStatusSchema.optional(),
  notes: z.string().trim().max(1000).optional(),
});
export type UpdateLoanInput = z.infer<typeof updateLoanSchema>;

export const createLoanPaymentSchema = z.object({
  amountMinor: amountMinorSchema,
  date: z.coerce.date(),
  method: z.string().trim().max(50).optional(),
  reference: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(1000).optional(),
});
export type CreateLoanPaymentInput = z.infer<typeof createLoanPaymentSchema>;
