import type { NextAuthConfig } from "next-auth"
import { NextResponse } from "next/server"
import Google from "next-auth/providers/google"
import {
  PLATFORM_ROUTE_CAPABILITY,
  platformCan,
  type PlatformRole,
} from "@/lib/permissions"

/**
 * Edge-compatible auth config — no Prisma adapter, no Node-only imports.
 * Uses JWT session strategy so middleware and full auth share the same cookie format.
 * Used by proxy.ts (Edge Runtime).
 * Full auth with Prisma adapter lives in lib/auth.ts (Node Runtime).
 */
export const authConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" as const },
  pages: { signIn: "/sign-in" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const path = nextUrl.pathname
      if (path.startsWith("/dashboard") && !isLoggedIn) return false

      // Platform-route gating: reads platformRole from the JWT (edge-safe, no DB).
      const matched = Object.keys(PLATFORM_ROUTE_CAPABILITY).find(
        (route) => path === route || path.startsWith(route + "/")
      )
      if (matched) {
        const role: PlatformRole =
          (auth?.user?.platformRole as PlatformRole) ?? "PLATFORM_USER"
        if (!platformCan(role, PLATFORM_ROUTE_CAPABILITY[matched])) {
          return NextResponse.redirect(new URL("/dashboard", nextUrl))
        }
      }
      return true
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub
      session.user.platformRole = (token.platformRole ??
        "PLATFORM_USER") as PlatformRole
      return session
    },
  },
} satisfies NextAuthConfig
