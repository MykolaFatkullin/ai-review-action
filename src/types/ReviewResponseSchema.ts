import { z } from "zod";

export const reviewCommentSchema = z.object({
  path: z.string().min(1),
  line: z.number().int().positive(),
  comment: z.string().min(1),
});

export const reviewResponseSchema = z.object({
  decision: z.enum(["APPROVE", "REQUEST_CHANGES", "COMMENT"]),
  summary: z.string(),
  comments: z.array(reviewCommentSchema),
});

export type ReviewComment = z.infer<typeof reviewCommentSchema>;
export type ReviewResponse = z.infer<typeof reviewResponseSchema>;