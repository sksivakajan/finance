// Display-layer only: converts between the wire format (a digit string of
// minor units, see @finance/shared's amountMinorSchema) and what a person
// types/reads. All real arithmetic happens server-side on bigint minor units;
// nothing here is used for calculation, only formatting.

export function formatMoney(amountMinor: string | bigint, currency: string): string {
  const amount = Number(amountMinor) / 100;
  try {
    return new Intl.NumberFormat("en-LK", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/** "1,500.50" -> "150050" (minor units, as the API expects). */
export function toMinorUnits(displayAmount: string): string {
  const normalized = displayAmount.trim().replace(/,/g, "");
  if (!normalized) return "0";
  const [whole = "0", fraction = ""] = normalized.split(".");
  const paddedFraction = (fraction + "00").slice(0, 2);
  const digits = `${whole}${paddedFraction}`.replace(/^0+(?=\d)/, "");
  return digits || "0";
}

/** "150050" -> "1500.50", for pre-filling an edit form. */
export function fromMinorUnits(amountMinor: string | bigint): string {
  const str = amountMinor.toString().padStart(3, "0");
  const whole = str.slice(0, -2);
  const fraction = str.slice(-2);
  return `${whole}.${fraction}`;
}
