import { amountMinorSchema, currencySchema } from "./money.js";

describe("amountMinorSchema", () => {
  it("parses a digit string into a bigint", () => {
    expect(amountMinorSchema.parse("150050")).toBe(150050n);
  });

  it("rejects a decimal string (must already be minor units)", () => {
    expect(amountMinorSchema.safeParse("1500.50").success).toBe(false);
  });

  it("rejects a negative amount", () => {
    expect(amountMinorSchema.safeParse("-100").success).toBe(false);
  });

  it("rejects zero (an expense/income of nothing isn't a real event)", () => {
    expect(amountMinorSchema.safeParse("0").success).toBe(false);
  });

  it("rejects non-numeric strings", () => {
    expect(amountMinorSchema.safeParse("abc").success).toBe(false);
    expect(amountMinorSchema.safeParse("1e5").success).toBe(false);
  });

  it("handles amounts beyond Number.MAX_SAFE_INTEGER without losing precision", () => {
    const huge = "9007199254740993"; // MAX_SAFE_INTEGER + 2
    expect(amountMinorSchema.parse(huge)).toBe(9007199254740993n);
  });
});

describe("currencySchema", () => {
  it("uppercases a lowercase currency code", () => {
    expect(currencySchema.parse("lkr")).toBe("LKR");
  });

  it("rejects a code that isn't exactly 3 characters", () => {
    expect(currencySchema.safeParse("LK").success).toBe(false);
    expect(currencySchema.safeParse("LKRR").success).toBe(false);
  });
});
