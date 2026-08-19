import { z } from "zod";

export const sendFriendRequestSchema = z.object({
  username: z.string().trim().min(1).max(20),
});
export type SendFriendRequestInput = z.infer<typeof sendFriendRequestSchema>;

export const friendRequestDirectionSchema = z.enum(["incoming", "outgoing"]);
export type FriendRequestDirection = z.infer<typeof friendRequestDirectionSchema>;
