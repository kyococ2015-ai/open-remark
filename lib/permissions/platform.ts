// lib/permissions/platform.ts
// SINGLE SOURCE OF TRUTH for instance-level (platform) authorization rules.
// Dependency-free (no Next.js, no Prisma client) so it is safe to import from
// edge middleware, Node services, and client components alike.

export type PlatformRole = "PLATFORM_OWNER" | "PLATFORM_USER"

export type PlatformCapability =
  | "VIEW_NOTICE_BOARD"
  | "VIEW_ADMINISTRATION"
  | "MANAGE_PLATFORM_SETTINGS"

const PLATFORM_PERMISSIONS: Record<
  PlatformRole,
  readonly PlatformCapability[]
> = {
  PLATFORM_OWNER: [
    "VIEW_NOTICE_BOARD",
    "VIEW_ADMINISTRATION",
    "MANAGE_PLATFORM_SETTINGS",
  ],
  PLATFORM_USER: [],
}

export const platformCan = (
  role: PlatformRole,
  cap: PlatformCapability
): boolean => PLATFORM_PERMISSIONS[role].includes(cap)

// Platform routes gated by capability — consumed by auth.config.ts + sidebar.
export const PLATFORM_ROUTE_CAPABILITY: Record<string, PlatformCapability> = {
  "/dashboard/notice-board": "VIEW_NOTICE_BOARD",
  "/dashboard/administration": "VIEW_ADMINISTRATION",
  "/dashboard/settings": "MANAGE_PLATFORM_SETTINGS",
}
