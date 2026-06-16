import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { db } from "@/lib/db"
import { authConfig } from "@/lib/auth.config"
import { claimPendingInvites } from "@/lib/services/membership-service"
import type { PlatformRole } from "@/lib/permissions"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id
        const u = await db.user.findUnique({
          where: { id: user.id },
          select: { platformRole: true },
        })
        token.platformRole = (u?.platformRole ??
          "PLATFORM_USER") as PlatformRole
      }
      return token
    },
  },
  events: {
    async createUser({ user }) {
      // First user to register becomes PLATFORM_OWNER.
      const ownerCount = await db.user.count({
        where: { platformRole: "PLATFORM_OWNER" },
      })
      if (ownerCount === 0 && user.id) {
        await db.user.update({
          where: { id: user.id },
          data: { platformRole: "PLATFORM_OWNER" },
        })
      }
    },
    async signIn({ user }) {
      if (user.id && user.email) {
        await claimPendingInvites(user.id, user.email)
      }
    },
  },
})
