import { z } from "zod";

/** Money is always represented as an integer minor-unit amount plus its ISO 4217
 * currency code. Never a float. See docs/BLUEPRINT.md §41. */
export interface Money {
  amountMinor: string; // BigInt serialized as string over the wire (JSON has no BigInt)
  currency: string; // ISO 4217, e.g. "LKR"
}

export const DEFAULT_CURRENCY = "LKR";

// The wire format for a monetary amount is a base-10 digit string (already
// converted to minor units client-side, e.g. by a CurrencyInput component) —
// never a JS number/float, which can't represent BigInt cents exactly and
// invites float-arithmetic bugs. `amountMinorSchema` parses it straight to a
// bigint so every finance module gets the same validation and conversion.
export const amountMinorSchema = z
  .string()
  .regex(/^\d+$/, "Amount must be a whole number of minor units (e.g. cents)")
  .transform((v) => BigInt(v))
  .refine((v) => v > 0n, "Amount must be greater than zero");

export const currencySchema = z
  .string()
  .trim()
  .length(3)
  .transform((v) => v.toUpperCase());

export const recurrenceFrequencySchema = z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"]);
export type RecurrenceFrequency = z.infer<typeof recurrenceFrequencySchema>;
