import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-compatible auth config — no Prisma adapter, no Node-only imports.
 * Uses JWT session strategy so middleware and full auth share the same cookie format.
 * Used by proxy.ts (Edge Runtime).
 * Full auth with Prisma adapter lives in lib/auth.ts (Node Runtime).
 */
export const authConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  session: { strategy: "jwt" as const },
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isDashboard = nextUrl.pathname.startsWith("/dashboard");
      if (isDashboard && !isLoggedIn) return false;
      return true;
    },
  },
} satisfies NextAuthConfig;
