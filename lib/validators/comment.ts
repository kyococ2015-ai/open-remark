import { z } from "zod";
import { CommentStatus } from "@/generated/prisma/client";

export const CreateCommentSchema = z.object({
  body: z.string().min(1).max(5000),
  siteKey: z.string().min(1),
  slug: z.string().min(1),
  url: z.string().url().optional(),
  parentId: z.string().cuid().optional(),
});

export const UpdateCommentStatusSchema = z.object({
  status: z.nativeEnum(CommentStatus),
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type UpdateCommentStatusInput = z.infer<typeof UpdateCommentStatusSchema>;
