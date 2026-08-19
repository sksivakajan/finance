import { splitEqual, splitExact, splitPercentage, splitShares, simplifyDebts, SplitError } from "./split-engine.js";

function sum(shares: { shareMinor: bigint }[]): bigint {
  return shares.reduce((acc, s) => acc + s.shareMinor, 0n);
}

describe("splitEqual", () => {
  it("splits evenly when the total divides cleanly", () => {
    const shares = splitEqual(300n, ["a", "b", "c"]);
    expect(shares.every((s) => s.shareMinor === 100n)).toBe(true);
  });

  it("distributes the remainder 1 minor unit at a time in userId order", () => {
    // 100 / 3 = 33 base, remainder 1 -> the first participant (userId asc) gets the extra unit
    const shares = splitEqual(100n, ["c", "a", "b"]);
    const byId = Object.fromEntries(shares.map((s) => [s.userId, s.shareMinor]));
    expect(byId.a).toBe(34n);
    expect(byId.b).toBe(33n);
    expect(byId.c).toBe(33n);
    expect(sum(shares)).toBe(100n);
  });

  it("dedupes a repeated participant id", () => {
    const shares = splitEqual(100n, ["a", "a", "b"]);
    expect(shares).toHaveLength(2);
    expect(sum(shares)).toBe(100n);
  });

  it("rejects an empty participant list", () => {
    expect(() => splitEqual(100n, [])).toThrow(SplitError);
  });

  it("handles a single participant (gets the whole amount)", () => {
    expect(splitEqual(100n, ["a"])).toEqual([{ userId: "a", shareMinor: 100n }]);
  });
});

describe("splitExact", () => {
  it("accepts amounts that sum exactly to the total", () => {
    const shares = splitExact(500n, [
      { userId: "a", shareMinor: 200n },
      { userId: "b", shareMinor: 300n },
    ]);
    expect(sum(shares)).toBe(500n);
  });

  it("rejects amounts that don't sum to the total, without silently correcting", () => {
    expect(() =>
      splitExact(500n, [
        { userId: "a", shareMinor: 200n },
        { userId: "b", shareMinor: 250n },
      ]),
    ).toThrow(SplitError);
  });

  it("rejects a negative share", () => {
    expect(() => splitExact(100n, [{ userId: "a", shareMinor: -10n }])).toThrow(SplitError);
  });
});

describe("splitPercentage", () => {
  it("rejects percentages that don't sum to 100%", () => {
    expect(() =>
      splitPercentage(100n, [
        { userId: "a", percentageBps: 5000 },
        { userId: "b", percentageBps: 4000 },
      ]),
    ).toThrow(SplitError);
  });

  it("applies largest-remainder rounding so the sum is always exact", () => {
    // 100 minor units split 3 ways at 33.33% each (9999bps) is invalid on its
    // own; use bps that actually sum to 10000 but don't divide evenly.
    const shares = splitPercentage(100n, [
      { userId: "a", percentageBps: 3334 },
      { userId: "b", percentageBps: 3333 },
      { userId: "c", percentageBps: 3333 },
    ]);
    expect(sum(shares)).toBe(100n);
    // a's exact share is 33.34 -> floors to 33 with remainder 3400/10000;
    // largest remainder should get the leftover unit.
    const byId = Object.fromEntries(shares.map((s) => [s.userId, s.shareMinor]));
    expect(byId.a).toBe(34n);
  });

  it("handles an uneven three-way split (classic 33/33/34 restaurant bill)", () => {
    const shares = splitPercentage(10_000n, [
      { userId: "a", percentageBps: 3333 },
      { userId: "b", percentageBps: 3333 },
      { userId: "c", percentageBps: 3334 },
    ]);
    expect(sum(shares)).toBe(10_000n);
  });
});

describe("splitShares", () => {
  it("distributes proportionally to integer share units", () => {
    const shares = splitShares(400n, [
      { userId: "a", shareUnits: 2 },
      { userId: "b", shareUnits: 1 },
      { userId: "c", shareUnits: 1 },
    ]);
    const byId = Object.fromEntries(shares.map((s) => [s.userId, s.shareMinor]));
    expect(byId.a).toBe(200n);
    expect(byId.b).toBe(100n);
    expect(byId.c).toBe(100n);
    expect(sum(shares)).toBe(400n);
  });

  it("rounds the remainder to the largest fractional remainder, sum always exact", () => {
    const shares = splitShares(100n, [
      { userId: "a", shareUnits: 1 },
      { userId: "b", shareUnits: 1 },
      { userId: "c", shareUnits: 1 },
    ]);
    expect(sum(shares)).toBe(100n);
  });

  it("rejects a zero or non-integer share unit", () => {
    expect(() => splitShares(100n, [{ userId: "a", shareUnits: 0 }])).toThrow(SplitError);
    expect(() => splitShares(100n, [{ userId: "a", shareUnits: 1.5 }])).toThrow(SplitError);
  });
});

describe("simplifyDebts", () => {
  it("suggests zero transfers when everyone is already net zero", () => {
    expect(simplifyDebts([{ userId: "a", netMinor: 0n }])).toEqual([]);
  });

  it("matches a single creditor with a single debtor", () => {
    const transfers = simplifyDebts([
      { userId: "a", netMinor: 100n },
      { userId: "b", netMinor: -100n },
    ]);
    expect(transfers).toEqual([{ fromUserId: "b", toUserId: "a", amountMinor: 100n }]);
  });

  it("minimizes transfer count for a three-way cycle (A owes B, B owes C, C owes A)", () => {
    // Net effect of a simple cycle nets out to fewer transfers than the
    // pairwise debts would suggest.
    const transfers = simplifyDebts([
      { userId: "a", netMinor: -50n },
      { userId: "b", netMinor: 0n },
      { userId: "c", netMinor: 50n },
    ]);
    expect(transfers).toHaveLength(1);
    expect(transfers[0]).toEqual({ fromUserId: "a", toUserId: "c", amountMinor: 50n });
  });

  it("handles multiple creditors and debtors with an exact split", () => {
    const transfers = simplifyDebts([
      { userId: "a", netMinor: 150n },
      { userId: "b", netMinor: 50n },
      { userId: "c", netMinor: -100n },
      { userId: "d", netMinor: -100n },
    ]);
    const totalTransferred = transfers.reduce((acc, t) => acc + t.amountMinor, 0n);
    expect(totalTransferred).toBe(200n);
    // Every debtor's total outgoing matches their debt, every creditor's
    // total incoming matches what they're owed.
    const outByUser: Record<string, bigint> = {};
    const inByUser: Record<string, bigint> = {};
    for (const t of transfers) {
      outByUser[t.fromUserId] = (outByUser[t.fromUserId] ?? 0n) + t.amountMinor;
      inByUser[t.toUserId] = (inByUser[t.toUserId] ?? 0n) + t.amountMinor;
    }
    expect(outByUser.c).toBe(100n);
    expect(outByUser.d).toBe(100n);
    expect(inByUser.a).toBe(150n);
    expect(inByUser.b).toBe(50n);
  });
});
