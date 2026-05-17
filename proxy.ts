import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"

// Use Edge-compatible config (no Prisma adapter) so middleware runs in Edge Runtime.
export const { auth: middleware } = NextAuth(authConfig)

export default middleware

export const config = {
  matcher: ["/dashboard/:path*"],
}
