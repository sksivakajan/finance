import { z } from "zod";
import { amountMinorSchema, currencySchema } from "./money.js";

export const settlementDirectionSchema = z.enum(["I_PAID", "THEY_PAID"]);
export type SettlementDirection = z.infer<typeof settlementDirectionSchema>;

export const createSettlementSchema = z.object({
  counterpartyId: z.string().min(1),
  // I_PAID: the current user paid counterpartyId. THEY_PAID: the other way
  // around (recording a payment you received, e.g. your friend Venmo'd you).
  direction: settlementDirectionSchema.default("I_PAID"),
  amountMinor: amountMinorSchema,
  currency: currencySchema,
  method: z.string().trim().max(50).optional(),
  reference: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(500).optional(),
});
export type CreateSettlementInput = z.infer<typeof createSettlementSchema>;
export type CreateSettlementRequest = z.input<typeof createSettlementSchema>;
