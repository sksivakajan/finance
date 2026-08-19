import { usernameSchema, passwordSchema, registerSchema, loginSchema } from "./auth.js";

describe("usernameSchema", () => {
  it("accepts letters, numbers, and underscores in either case", () => {
    expect(usernameSchema.safeParse("John_Doe42").success).toBe(true);
  });

  it("rejects usernames shorter than 3 characters", () => {
    expect(usernameSchema.safeParse("ab").success).toBe(false);
  });

  it("rejects usernames longer than 20 characters", () => {
    expect(usernameSchema.safeParse("a".repeat(21)).success).toBe(false);
  });

  it("rejects spaces and punctuation", () => {
    expect(usernameSchema.safeParse("john doe").success).toBe(false);
    expect(usernameSchema.safeParse("john.doe").success).toBe(false);
    expect(usernameSchema.safeParse("john-doe").success).toBe(false);
  });

  it("does not itself normalize case (the server lowercases separately for storage)", () => {
    expect(usernameSchema.parse("JohnDoe")).toBe("JohnDoe");
  });
});

describe("passwordSchema", () => {
  it("rejects passwords shorter than 10 characters", () => {
    expect(passwordSchema.safeParse("short1234").success).toBe(false);
  });

  it("accepts a 10-character password with no complexity requirement", () => {
    expect(passwordSchema.safeParse("aaaaaaaaaa").success).toBe(true);
  });

  it("rejects passwords longer than 128 characters", () => {
    expect(passwordSchema.safeParse("a".repeat(129)).success).toBe(false);
  });
});

describe("registerSchema", () => {
  const valid = { email: "Test@Example.com", password: "correcthorsebattery", username: "testuser", displayName: "Test" };

  it("accepts a valid payload and lowercases + trims the email", () => {
    const result = registerSchema.parse(valid);
    expect(result.email).toBe("test@example.com");
  });

  it("rejects an invalid email", () => {
    expect(registerSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
  });

  it("rejects an empty display name", () => {
    expect(registerSchema.safeParse({ ...valid, displayName: "" }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("does not enforce the password-strength floor on login (only shape)", () => {
    // A short password must still be able to reach the "invalid credentials"
    // check server-side, rather than being rejected as a validation error
    // that would leak information about password policy pre-auth.
    expect(loginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
  });

  it("treats an empty password as invalid", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });

  it("twoFactorCode is optional", () => {
    const result = loginSchema.safeParse({ email: "a@b.com", password: "x" });
    expect(result.success).toBe(true);
  });
});
