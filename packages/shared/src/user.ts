import { z } from "zod";

export const visibilityAudienceSchema = z.enum(["EVERYONE", "FRIENDS", "NOBODY"]);
export type VisibilityAudience = z.infer<typeof visibilityAudienceSchema>;

// Accepts either a full URL (an external/CDN avatar) or a root-relative path
// (what our own /uploads endpoint returns). A relative path only resolves
// correctly if it's rendered against whatever origin is currently serving
// the app, so it must never be converted to an absolute URL before storage --
// baking in "today's" origin breaks the moment that origin changes (a new
// deploy domain, a different tunnel host in dev, etc).
export const avatarUrlSchema = z
  .string()
  .trim()
  .refine((v) => v.startsWith("/") || z.string().url().safeParse(v).success, {
    message: "Must be a URL or a root-relative path",
  });

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(50).optional(),
  bio: z.string().trim().max(280).optional(),
  avatarUrl: avatarUrlSchema.optional(),
  defaultCurrency: z.string().length(3).optional(),
  timezone: z.string().min(1).max(64).optional(),
  whoCanFriendRequest: visibilityAudienceSchema.optional(),
  whoCanMessage: visibilityAudienceSchema.optional(),
  whoCanSeeProfile: visibilityAudienceSchema.optional(),
  whoCanAddToGroups: visibilityAudienceSchema.optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const deleteAccountSchema = z.object({
  password: z.string().min(1),
});
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
