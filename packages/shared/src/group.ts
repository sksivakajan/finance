import { z } from "zod";

export const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  avatarUrl: z.string().trim().url().optional(),
  memberUserIds: z.array(z.string().min(1)).default([]),
});
export type CreateGroupInput = z.infer<typeof createGroupSchema>;

export const addGroupMemberSchema = z.object({
  userId: z.string().min(1),
});
export type AddGroupMemberInput = z.infer<typeof addGroupMemberSchema>;
