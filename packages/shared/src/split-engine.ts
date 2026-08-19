// Pure, framework-agnostic split math per docs/BLUEPRINT.md §11. No floating
// point anywhere — every amount in and out is a BigInt minor-unit value. Used
// both server-side (the authoritative calculation) and client-side (live
// preview while filling out a shared-expense form).

export class SplitError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "SplitError";
  }
}

export interface Share {
  userId: string;
  shareMinor: bigint;
}

function assertInvariant(totalMinor: bigint, shares: Share[]): void {
  const sum = shares.reduce((acc, s) => acc + s.shareMinor, 0n);
  if (sum !== totalMinor) {
    // Should be unreachable if the math below is correct — a defensive check
    // per §11's "every split method funnels through one invariant check
    // before persisting", not a normal user-facing error path.
    throw new SplitError(
      "EXPENSE_SPLIT_INVARIANT_VIOLATED",
      `Split shares sum to ${sum} but expected ${totalMinor}.`,
    );
  }
}

/** Distributes `remainingCount` extra minor units (already known to be a
 * small non-negative integer) one at a time to the participants with the
 * largest fractional remainder — the standard largest-remainder apportionment
 * method used by both percentage and shares splits. Ties break by userId
 * ascending so the result is deterministic and reproducible. */
function largestRemainderDistribute(
  items: { userId: string; base: bigint; remainder: bigint }[],
  remainingCount: number,
): Share[] {
  const order = [...items].sort((a, b) => {
    if (a.remainder !== b.remainder) return a.remainder > b.remainder ? -1 : 1;
    return a.userId < b.userId ? -1 : 1;
  });
  const bumped = new Set(order.slice(0, remainingCount).map((i) => i.userId));
  return items.map((i) => ({ userId: i.userId, shareMinor: i.base + (bumped.has(i.userId) ? 1n : 0n) }));
}

/** Equal split: base + remainder distributed 1 minor unit at a time to the
 * first `remainder` participants in userId-ascending order, so the sum is
 * always exact regardless of how evenly `totalMinor` divides. */
export function splitEqual(totalMinor: bigint, participantIds: string[]): Share[] {
  if (participantIds.length === 0) {
    throw new SplitError("EXPENSE_NO_PARTICIPANTS", "An equal split needs at least one participant.");
  }
  const uniqueIds = [...new Set(participantIds)];
  const n = BigInt(uniqueIds.length);
  const base = totalMinor / n;
  const remainder = Number(totalMinor % n);
  const ordered = [...uniqueIds].sort();
  const shares = ordered.map((userId, i) => ({ userId, shareMinor: base + (i < remainder ? 1n : 0n) }));
  assertInvariant(totalMinor, shares);
  return shares;
}

/** Exact split: caller supplies the amount per participant directly. Rejected
 * outright (no silent correction) if it doesn't sum to the total. */
export function splitExact(totalMinor: bigint, shares: { userId: string; shareMinor: bigint }[]): Share[] {
  if (shares.length === 0) {
    throw new SplitError("EXPENSE_NO_PARTICIPANTS", "An exact split needs at least one participant.");
  }
  if (shares.some((s) => s.shareMinor < 0n)) {
    throw new SplitError("EXPENSE_SPLIT_MISMATCH", "Split amounts cannot be negative.");
  }
  const sum = shares.reduce((acc, s) => acc + s.shareMinor, 0n);
  if (sum !== totalMinor) {
    throw new SplitError(
      "EXPENSE_SPLIT_MISMATCH",
      `Split amounts sum to ${sum} but the expense total is ${totalMinor}.`,
    );
  }
  return shares.map((s) => ({ userId: s.userId, shareMinor: s.shareMinor }));
}

/** Percentage split: caller supplies basis points (1/100 of a percent) per
 * participant, must sum to exactly 10000 (100%). Rounded down per
 * participant, then the leftover minor units go to the largest fractional
 * remainders first. */
export function splitPercentage(totalMinor: bigint, shares: { userId: string; percentageBps: number }[]): Share[] {
  if (shares.length === 0) {
    throw new SplitError("EXPENSE_NO_PARTICIPANTS", "A percentage split needs at least one participant.");
  }
  const sumBps = shares.reduce((acc, s) => acc + s.percentageBps, 0);
  if (sumBps !== 10_000) {
    throw new SplitError(
      "EXPENSE_SPLIT_MISMATCH",
      `Percentages sum to ${(sumBps / 100).toFixed(2)}% but must sum to exactly 100%.`,
    );
  }
  const computed = shares.map((s) => {
    const bps = BigInt(s.percentageBps);
    const raw = totalMinor * bps;
    return { userId: s.userId, base: raw / 10_000n, remainder: raw % 10_000n };
  });
  const allocated = computed.reduce((acc, c) => acc + c.base, 0n);
  const remainingCount = Number(totalMinor - allocated);
  const result = largestRemainderDistribute(computed, remainingCount);
  assertInvariant(totalMinor, result);
  return result;
}

/** Shares split: caller supplies integer share units per participant (e.g.
 * 2:1:1 for "double portion"). Same largest-remainder rounding as percentage. */
export function splitShares(totalMinor: bigint, shares: { userId: string; shareUnits: number }[]): Share[] {
  if (shares.length === 0) {
    throw new SplitError("EXPENSE_NO_PARTICIPANTS", "A shares split needs at least one participant.");
  }
  if (shares.some((s) => !Number.isInteger(s.shareUnits) || s.shareUnits <= 0)) {
    throw new SplitError("EXPENSE_SPLIT_MISMATCH", "Share units must be positive whole numbers.");
  }
  const totalUnits = BigInt(shares.reduce((acc, s) => acc + s.shareUnits, 0));
  const computed = shares.map((s) => {
    const raw = totalMinor * BigInt(s.shareUnits);
    return { userId: s.userId, base: raw / totalUnits, remainder: raw % totalUnits };
  });
  const allocated = computed.reduce((acc, c) => acc + c.base, 0n);
  const remainingCount = Number(totalMinor - allocated);
  const result = largestRemainderDistribute(computed, remainingCount);
  assertInvariant(totalMinor, result);
  return result;
}

export interface NetBalance {
  userId: string;
  /** Positive = this user is owed money overall; negative = they owe. */
  netMinor: bigint;
}

export interface SuggestedTransfer {
  fromUserId: string;
  toUserId: string;
  amountMinor: bigint;
}

/** Debt simplification per docs/BLUEPRINT.md §12: greedy match of the largest
 * creditor against the largest debtor, repeated until everyone nets to zero.
 * Minimizes transfer count in practice (not provably optimal in the general
 * case, but standard practice — documented as such). Read-only suggestion;
 * never auto-applied. */
export function simplifyDebts(balances: NetBalance[]): SuggestedTransfer[] {
  const creditors = balances
    .filter((b) => b.netMinor > 0n)
    .map((b) => ({ userId: b.userId, remaining: b.netMinor }))
    .sort((a, b) => (b.remaining > a.remaining ? 1 : b.remaining < a.remaining ? -1 : 0));
  const debtors = balances
    .filter((b) => b.netMinor < 0n)
    .map((b) => ({ userId: b.userId, remaining: -b.netMinor }))
    .sort((a, b) => (b.remaining > a.remaining ? 1 : b.remaining < a.remaining ? -1 : 0));

  const transfers: SuggestedTransfer[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]!;
    const debtor = debtors[di]!;
    const amount = creditor.remaining < debtor.remaining ? creditor.remaining : debtor.remaining;
    if (amount > 0n) {
      transfers.push({ fromUserId: debtor.userId, toUserId: creditor.userId, amountMinor: amount });
    }
    creditor.remaining -= amount;
    debtor.remaining -= amount;
    if (creditor.remaining === 0n) ci++;
    if (debtor.remaining === 0n) di++;
  }
  return transfers;
}
