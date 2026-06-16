import { z } from "zod"

export const GrantableRoleSchema = z.enum(["SITE_ADMIN", "SITE_MODERATOR"])

export const CreateInviteSchema = z.object({
  email: z.string().email(),
  role: GrantableRoleSchema,
})

export const ChangeRoleSchema = z.object({
  userId: z.string().min(1),
  role: GrantableRoleSchema,
})

export const RemoveMemberSchema = z.object({
  userId: z.string().min(1),
})

export const RevokeInviteSchema = z.object({
  inviteId: z.string().min(1),
})
