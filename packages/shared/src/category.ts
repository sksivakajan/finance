import { z } from "zod";

export const categoryKindSchema = z.enum(["INCOME", "EXPENSE"]);
export type CategoryKind = z.infer<typeof categoryKindSchema>;

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(50),
  kind: categoryKindSchema,
  icon: z.string().trim().max(50).optional(),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  icon: z.string().trim().max(50).optional(),
});
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
