import { z } from "zod";

export const createConversationSchema = z.object({
  friendUserId: z.string().trim().min(1),
});
export type CreateConversationInput = z.infer<typeof createConversationSchema>;

export const messageTypeSchema = z.enum(["TEXT", "IMAGE", "FILE", "SYSTEM"]);
export type MessageType = z.infer<typeof messageTypeSchema>;

export const createMessageSchema = z
  .object({
    body: z.string().trim().min(1).max(4000).optional(),
    // Relative path from POST /uploads, same convention as expense/income attachmentUrl.
    attachmentUrl: z.string().trim().min(1).max(500).optional(),
    type: messageTypeSchema.default("TEXT"),
  })
  .refine((v) => Boolean(v.body) || Boolean(v.attachmentUrl), {
    message: "A message needs a body or an attachment.",
    path: ["body"],
  });
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type CreateMessageRequest = z.input<typeof createMessageSchema>;

export const updateMessageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;
