import type { DefaultSession } from "next-auth"
import type { PlatformRole } from "@/lib/permissions"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      platformRole: PlatformRole
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    platformRole?: PlatformRole
  }
}
