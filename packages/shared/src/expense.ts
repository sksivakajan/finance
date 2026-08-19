import { z } from "zod";
import { amountMinorSchema, currencySchema, recurrenceFrequencySchema } from "./money.js";

// Personal expenses (splitMethod=NONE, the default) work exactly as in Phase
// 1: payerId defaults to the owner server-side, no participants/splits rows.
// A shared expense supplies splitMethod plus the fields that method needs —
// validated here so a malformed split never reaches the split-engine at all.
export const splitMethodSchema = z.enum(["NONE", "EQUAL", "EXACT", "PERCENTAGE", "SHARES"]);
export type SplitMethodValue = z.infer<typeof splitMethodSchema>;

const expenseObjectSchema = z.object({
  amountMinor: amountMinorSchema,
  currency: currencySchema,
  categoryId: z.string().min(1).optional(),
  merchant: z.string().trim().max(100).optional(),
  description: z.string().trim().max(500).optional(),
  date: z.coerce.date(),
  paymentMethod: z.string().trim().max(50).optional(),
  // Relative path from POST /uploads (e.g. "/uploads/<userId>/<file>"), not
  // an absolute URL — the upload endpoint doesn't know its own public origin.
  attachmentUrl: z.string().trim().min(1).max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
  isRecurring: z.boolean().default(false),
  recurrenceRule: recurrenceFrequencySchema.optional(),
  // Who actually paid, if different from the person recording it (e.g. a
  // friend covered the bill). Defaults to the recording user server-side.
  payerId: z.string().min(1).optional(),
  groupId: z.string().min(1).optional(),
  splitMethod: splitMethodSchema.default("NONE"),
  // EQUAL
  participantIds: z.array(z.string().min(1)).optional(),
  // EXACT
  exactShares: z.array(z.object({ userId: z.string().min(1), shareMinor: amountMinorSchema })).optional(),
  // PERCENTAGE
  percentageShares: z
    .array(z.object({ userId: z.string().min(1), percentageBps: z.number().int().min(1).max(10_000) }))
    .optional(),
  // SHARES
  unitShares: z.array(z.object({ userId: z.string().min(1), shareUnits: z.number().int().min(1) })).optional(),
});

function validateSplitFields(val: z.infer<typeof expenseObjectSchema>, ctx: z.RefinementCtx): void {
  switch (val.splitMethod) {
    case "EQUAL":
      if (!val.participantIds || val.participantIds.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "An equal split needs at least one participant.",
          path: ["participantIds"],
        });
      }
      break;
    case "EXACT":
      if (!val.exactShares || val.exactShares.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "An exact split needs at least one participant amount.",
          path: ["exactShares"],
        });
      }
      break;
    case "PERCENTAGE":
      if (!val.percentageShares || val.percentageShares.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A percentage split needs at least one participant percentage.",
          path: ["percentageShares"],
        });
      }
      break;
    case "SHARES":
      if (!val.unitShares || val.unitShares.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A shares split needs at least one participant share count.",
          path: ["unitShares"],
        });
      }
      break;
    case "NONE":
      break;
  }
}

export const createExpenseSchema = expenseObjectSchema.superRefine(validateSplitFields);
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type CreateExpenseRequest = z.input<typeof createExpenseSchema>;

// A partial update only re-validates the split fields if the caller is
// actually touching the split (splitMethod present in the payload) — editing
// just the merchant name on a shared expense shouldn't require resending the
// whole participant list.
export const updateExpenseSchema = expenseObjectSchema.partial().superRefine((val, ctx) => {
  if (val.splitMethod !== undefined) validateSplitFields(val as z.infer<typeof expenseObjectSchema>, ctx);
});
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type UpdateExpenseRequest = z.input<typeof updateExpenseSchema>;
