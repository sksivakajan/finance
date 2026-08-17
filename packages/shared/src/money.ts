/** Money is always represented as an integer minor-unit amount plus its ISO 4217
 * currency code. Never a float. See docs/BLUEPRINT.md §41. */
export interface Money {
  amountMinor: string; // BigInt serialized as string over the wire (JSON has no BigInt)
  currency: string; // ISO 4217, e.g. "LKR"
}

export const DEFAULT_CURRENCY = "LKR";
