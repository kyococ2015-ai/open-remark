import { z } from "zod";

export const CreateSiteSchema = z.object({
  name: z.string().min(1).max(100),
  domain: z
    .string()
    .min(1)
    .max(253)
    .regex(/^[a-zA-Z0-9.-]+$/, "Invalid domain"),
  autoApprove: z.boolean().optional().default(false),
  allowedOrigins: z.array(z.string().url()).optional().default([]),
});

export const UpdateSiteSchema = CreateSiteSchema.partial();

export type CreateSiteInput = z.infer<typeof CreateSiteSchema>;
export type UpdateSiteInput = z.infer<typeof UpdateSiteSchema>;
