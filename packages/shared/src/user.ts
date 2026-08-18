import { z } from "zod";

export const visibilityAudienceSchema = z.enum(["EVERYONE", "FRIENDS", "NOBODY"]);
export type VisibilityAudience = z.infer<typeof visibilityAudienceSchema>;

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(50).optional(),
  bio: z.string().trim().max(280).optional(),
  avatarUrl: z.string().trim().url().optional(),
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
