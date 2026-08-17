import { z } from "zod";

// Case-insensitively unique at the DB level: the server lowercases this for the
// unique `username` column and keeps the as-typed casing in `usernameDisplay`.
// Reserved/impersonation words are rejected server-side, not here.
export const usernameSchema = z
  .string()
  .min(3)
  .max(20)
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores");

// Length-only floor on purpose: complexity rules (must contain a symbol, etc.) push
// users toward predictable patterns and are widely considered obsolete guidance
// (NIST 800-63B). Length + a breached-password check (added later) is the stronger
// control.
export const passwordSchema = z.string().min(10).max(128);

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: passwordSchema,
  username: usernameSchema,
  displayName: z.string().trim().min(1).max(50),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
  twoFactorCode: z.string().trim().optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const resendVerificationSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;

export const twoFactorVerifySchema = z.object({
  code: z.string().trim().min(6).max(10),
});
export type TwoFactorVerifyInput = z.infer<typeof twoFactorVerifySchema>;

export const twoFactorDisableSchema = z.object({
  password: z.string().min(1),
  code: z.string().trim().min(6).max(10),
});
export type TwoFactorDisableInput = z.infer<typeof twoFactorDisableSchema>;
