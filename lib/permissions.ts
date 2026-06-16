// lib/permissions.ts
// SINGLE SOURCE OF TRUTH for all authorization rules.
// Dependency-free (no Next.js, no Prisma client) so it is safe to import from
// edge middleware, Node services, and client components alike.

export type PlatformRole = "PLATFORM_OWNER" | "PLATFORM_USER"
export type SiteRole = "SITE_OWNER" | "SITE_ADMIN" | "SITE_MODERATOR"

export type SiteCapability =
  | "MODERATE"
  | "MANAGE_SETTINGS"
  | "MANAGE_MODERATORS"
  | "MANAGE_ADMINS"
  | "DELETE_SITE"
  | "TRANSFER_SITE"

export type PlatformCapability =
  | "VIEW_NOTICE_BOARD"
  | "VIEW_ADMINISTRATION"
  | "MANAGE_PLATFORM_SETTINGS"

const SITE_PERMISSIONS: Record<SiteRole, readonly SiteCapability[]> = {
  SITE_OWNER: [
    "MODERATE",
    "MANAGE_SETTINGS",
    "MANAGE_MODERATORS",
    "MANAGE_ADMINS",
    "DELETE_SITE",
    "TRANSFER_SITE",
  ],
  SITE_ADMIN: ["MODERATE", "MANAGE_SETTINGS", "MANAGE_MODERATORS"],
  SITE_MODERATOR: ["MODERATE"],
}

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

export const siteCan = (role: SiteRole, cap: SiteCapability): boolean =>
  SITE_PERMISSIONS[role].includes(cap)

export const platformCan = (
  role: PlatformRole,
  cap: PlatformCapability
): boolean => PLATFORM_PERMISSIONS[role].includes(cap)

// Roles that can be granted via the team UI / invites (never SITE_OWNER).
export type GrantableSiteRole = Extract<
  SiteRole,
  "SITE_ADMIN" | "SITE_MODERATOR"
>

// Which capability is required to grant/remove a given role.
export const ROLE_GRANT_CAPABILITY: Record<GrantableSiteRole, SiteCapability> =
  {
    SITE_ADMIN: "MANAGE_ADMINS",
    SITE_MODERATOR: "MANAGE_MODERATORS",
  }

// Roles a given site role may grant — consumed by the invite form (SSOT for UI).
export const GRANTABLE_SITE_ROLES: Record<
  SiteRole,
  readonly GrantableSiteRole[]
> = {
  SITE_OWNER: ["SITE_ADMIN", "SITE_MODERATOR"],
  SITE_ADMIN: ["SITE_MODERATOR"],
  SITE_MODERATOR: [],
}

// Platform routes gated by capability — consumed by auth.config.ts + sidebar.
export const PLATFORM_ROUTE_CAPABILITY: Record<string, PlatformCapability> = {
  "/dashboard/notice-board": "VIEW_NOTICE_BOARD",
  "/dashboard/administration": "VIEW_ADMINISTRATION",
  "/dashboard/settings": "MANAGE_PLATFORM_SETTINGS",
}
