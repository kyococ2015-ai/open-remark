import { z } from "zod"

export const ThemeSchema = z.enum(["AUTO", "LIGHT", "DARK"])

export const CreateSiteSchema = z.object({
  name: z.string().min(1).max(100),
  domain: z
    .string()
    .min(1)
    .max(253)
    .regex(/^[a-zA-Z0-9.:\/\-]+$/, "Invalid domain"),
  autoApprove: z.boolean().optional().default(false),
  allowedOrigins: z
    .array(
      z
        .string()
        .refine(
          (v) => v === "*" || z.string().url().safeParse(v).success,
          "Must be a valid URL or *"
        )
    )
    .optional()
    .default([]),
  theme: ThemeSchema.optional().default("AUTO"),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a 6-digit hex color")
    .optional()
    .default("#0f172a"),
  radius: z.number().int().min(0).max(24).optional().default(8),
})

export const UpdateSiteSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  domain: z
    .string()
    .min(1)
    .max(253)
    .regex(/^[a-zA-Z0-9.:\/\-]+$/, "Invalid domain")
    .optional(),
  autoApprove: z.boolean().optional(),
  allowedOrigins: z
    .array(
      z
        .string()
        .refine(
          (v) => v === "*" || z.string().url().safeParse(v).success,
          "Must be a valid URL or *"
        )
    )
    .optional(),
  theme: ThemeSchema.optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a 6-digit hex color")
    .optional(),
  radius: z.number().int().min(0).max(24).optional(),
})

export type CreateSiteInput = z.infer<typeof CreateSiteSchema>
export type UpdateSiteInput = z.infer<typeof UpdateSiteSchema>
