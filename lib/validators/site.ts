import { z } from "zod";

export const ThemeSchema = z.enum(["AUTO", "LIGHT", "DARK"]);

export const CreateSiteSchema = z.object({
  name: z.string().min(1).max(100),
  domain: z
    .string()
    .min(1)
    .max(253)
    .regex(/^[a-zA-Z0-9.-]+$/, "Invalid domain"),
  autoApprove: z.boolean().optional().default(false),
  allowedOrigins: z.array(z.string().url()).optional().default([]),
  theme: ThemeSchema.optional().default("AUTO"),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a 6-digit hex color")
    .optional()
    .default("#0f172a"),
  radius: z.number().int().min(0).max(24).optional().default(8),
});

export const UpdateSiteSchema = CreateSiteSchema.partial();

export type CreateSiteInput = z.infer<typeof CreateSiteSchema>;
export type UpdateSiteInput = z.infer<typeof UpdateSiteSchema>;
