# RBAC Roles — Design Spec

**Date:** 2026-06-16
**Status:** Approved (brainstorming) — ready for implementation plan
**Scope:** Full feature, one spec.

## 1. Summary

Introduce two independent role dimensions to OpenRemark's admin side:

- **PlatformRole** (`PLATFORM_OWNER` | `PLATFORM_USER`) — instance-level. Gates the platform pages (Notice Board, Administration, Platform Settings).
- **SiteRole** (`SITE_OWNER` | `SITE_ADMIN` | `SITE_MODERATOR`) — per-site membership. Enables teams: an owner can grant others scoped access to a single site.

Today authorization is pure ownership: `Site.ownerId` is a single FK and every service filters `where: { ownerId }`. The unused `User.role` (`OWNER`/`ADMIN`) enum is removed. This spec adds a membership model, a single-source-of-truth permission module, role-aware services/routes, an invite-by-email flow, team-management UI, and sidebar/edge gating.

This feature touches the **admin auth system only** (Auth.js session). The widget JWT system is untouched.

## 2. Decisions (locked during brainstorming)

| Question | Decision |
|---|---|
| How is `PLATFORM_OWNER` determined? | **First user bootstraps** — the first registered user becomes `PLATFORM_OWNER`; all later users default `PLATFORM_USER`. |
| How are site members added? | **Invite by email + pending state** — immediate `SiteMember` if the email already has an account, otherwise a `PENDING` `SiteInvite` auto-claimed on that person's next sign-in. |
| `SITE_ADMIN` team power? | **Manage moderators only** — admins may invite/remove `SITE_MODERATOR`, never admins or the owner. No privilege escalation. |
| Data model | **Approach A** — `SiteMember` table; the owner also gets a `SiteMember(SITE_OWNER)` row. `Site.ownerId` is kept as the denormalized authoritative pointer. |
| Permission logic location | **Single source of truth** in `lib/permissions.ts`; nothing re-encodes role rules. |

## 3. Capability matrix

| Capability | SITE_OWNER | SITE_ADMIN | SITE_MODERATOR |
|---|---|---|---|
| Moderate comments (approve/spam/delete) | ✅ | ✅ | ✅ |
| Ban commenters | ✅ | ✅ | ✅ |
| Edit site settings (theme, email, SMTP, …) | ✅ | ✅ | ❌ |
| Manage moderators (invite/remove) | ✅ | ✅ | ❌ |
| Manage admins (invite/remove) | ✅ | ❌ | ❌ |
| Delete site | ✅ | ❌ | ❌ |
| Transfer ownership | ✅ | ❌ | ❌ |

Platform capabilities: `VIEW_NOTICE_BOARD`, `VIEW_ADMINISTRATION`, `MANAGE_PLATFORM_SETTINGS` — granted to `PLATFORM_OWNER` only.

## 4. Single source of truth — `lib/permissions.ts`

Dependency-free (string-literal constants — **no Next.js, no Prisma client import**) so the same module is safely importable from edge middleware (`proxy.ts`), Node services, and the client sidebar.

```ts
export type PlatformRole = "PLATFORM_OWNER" | "PLATFORM_USER"
export type SiteRole     = "SITE_OWNER" | "SITE_ADMIN" | "SITE_MODERATOR"

export type SiteCapability =
  | "MODERATE" | "MANAGE_SETTINGS" | "MANAGE_MODERATORS"
  | "MANAGE_ADMINS" | "DELETE_SITE" | "TRANSFER_SITE"
export type PlatformCapability =
  | "VIEW_NOTICE_BOARD" | "VIEW_ADMINISTRATION" | "MANAGE_PLATFORM_SETTINGS"

const SITE_PERMISSIONS: Record<SiteRole, readonly SiteCapability[]> = {
  SITE_OWNER:     ["MODERATE","MANAGE_SETTINGS","MANAGE_MODERATORS","MANAGE_ADMINS","DELETE_SITE","TRANSFER_SITE"],
  SITE_ADMIN:     ["MODERATE","MANAGE_SETTINGS","MANAGE_MODERATORS"],
  SITE_MODERATOR: ["MODERATE"],
}
const PLATFORM_PERMISSIONS: Record<PlatformRole, readonly PlatformCapability[]> = {
  PLATFORM_OWNER: ["VIEW_NOTICE_BOARD","VIEW_ADMINISTRATION","MANAGE_PLATFORM_SETTINGS"],
  PLATFORM_USER:  [],
}

export const siteCan     = (r: SiteRole, c: SiteCapability)         => SITE_PERMISSIONS[r].includes(c)
export const platformCan  = (r: PlatformRole, c: PlatformCapability) => PLATFORM_PERMISSIONS[r].includes(c)

// Which platform capability gates which route — consumed by proxy.ts + sidebar.
export const PLATFORM_ROUTE_CAPABILITY: Record<string, PlatformCapability> = {
  "/dashboard/notice-board":   "VIEW_NOTICE_BOARD",
  "/dashboard/administration": "VIEW_ADMINISTRATION",
  "/dashboard/settings":       "MANAGE_PLATFORM_SETTINGS",
}

// Roles a given site role is allowed to grant via invites (admins → moderators only).
export const GRANTABLE_SITE_ROLES: Record<SiteRole, readonly SiteRole[]> = {
  SITE_OWNER: ["SITE_ADMIN", "SITE_MODERATOR"],
  SITE_ADMIN: ["SITE_MODERATOR"],
  SITE_MODERATOR: [],
}
```

The Prisma enums (Section 5) mirror these exact string values; the **truth** lives in this module.

## 5. Schema changes — `prisma/schema.prisma`

```prisma
enum PlatformRole { PLATFORM_OWNER  PLATFORM_USER }
enum SiteRole     { SITE_OWNER  SITE_ADMIN  SITE_MODERATOR }
enum InviteStatus { PENDING  ACCEPTED  REVOKED }

model User {
  // remove `role Role` (unused) →
  platformRole PlatformRole @default(PLATFORM_USER)
  memberships  SiteMember[]
  // …existing fields/relations…
}

model SiteMember {
  id        String   @id @default(cuid())
  userId    String
  siteId    String
  role      SiteRole
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  site Site @relation(fields: [siteId], references: [id], onDelete: Cascade)
  @@unique([userId, siteId])
  @@index([userId])
  @@index([siteId, role])
}

model SiteInvite {
  id          String       @id @default(cuid())
  siteId      String
  email       String       // lowercased invitee email
  role        SiteRole
  invitedById String
  status      InviteStatus @default(PENDING)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  site Site @relation(fields: [siteId], references: [id], onDelete: Cascade)
  @@unique([siteId, email])
  @@index([email, status])
  @@index([siteId])
}
```

`Site` gains `members SiteMember[]` and `invites SiteInvite[]`. The old `enum Role` and `User.role` are removed (zero usages in the codebase).

**Invariant (the single intentional denormalization):** for every `Site`, there is exactly one `SiteMember` with `role = SITE_OWNER` whose `userId = Site.ownerId`. Enforced transactionally on create and transfer.

## 6. Authorization layer

- **`lib/services/membership-service.ts`** (framework-agnostic, may import `lib/db.ts`):
  - `getMembership(userId, siteId)` → `SiteMember | null`
  - `getSitesForUser(userId)` → sites via memberships (replaces `getSitesByOwner`)
  - `requireSiteAccess(siteId, userId, capability)` → loads membership, calls `siteCan`, throws `ApiError(403)` if not permitted / `ApiError(404)` if no membership
  - `listMembers(siteId)`, `addMember(siteId, userId, role)`, `removeMember(siteId, userId)`, `changeRole(siteId, userId, role)`
  - `createInvite(siteId, invitedById, email, role)`, `revokeInvite(inviteId)`, `claimPendingInvites(userId, email)`
- **Refactor existing services** to route through `requireSiteAccess`:
  - `site-service.ts`: `getSiteByIdForOwner` → `requireSiteAccess`; `getSitesByOwner` → `getSitesForUser`; `deleteSite` gated by `DELETE_SITE`; `transferSite` gated by `TRANSFER_SITE` and updates `ownerId` + the owner `SiteMember` row in one `db.$transaction`.
  - `page-service.ts`, `moderation-service.ts`: swap the `ownerId` guard for `requireSiteAccess(..., "MODERATE")` (moderation) or the appropriate capability.
- Route handlers stay thin (≤25 lines): resolve `userId` from session → call service with capability → respond. They do not re-encode rules.

## 7. Platform-owner bootstrap & session plumbing

- **`lib/auth.ts` `events.createUser`**: if no `User` with `platformRole = PLATFORM_OWNER` exists, promote the just-created user to `PLATFORM_OWNER`.
- **`events.signIn`**: call `claimPendingInvites(user.id, user.email)` — converts matching `PENDING` invites into `SiteMember` rows and marks them `ACCEPTED`. Covers new and returning users.
- **`jwt` callback**: load `platformRole` into the token on sign-in.
- **`session` callback**: expose `session.user.platformRole`.
- This makes `platformRole` available to edge middleware without a DB call.

## 8. Route & navigation gating

- **`proxy.ts`** (edge): keep the logged-in check; additionally, for any path matched in `PLATFORM_ROUTE_CAPABILITY`, redirect to `/dashboard` unless `platformCan(token.platformRole, cap)` passes.
- **`components/dashboard/app-sidebar.tsx`**: receive `platformRole` (from the dashboard server layout); filter the "System" group and the "Settings" item with `platformCan`. `PLATFORM_USER` never sees them.
- **Site-level pages** (`app/dashboard/sites/[siteId]/**`): gated inside the server component via `requireSiteAccess` (per-site DB lookups can't run in edge middleware).

## 9. Invite flow

1. A `SITE_OWNER`/`SITE_ADMIN` opens the team UI and submits `{ email, role }`. `createInvite` enforces `GRANTABLE_SITE_ROLES[callerRole]` (admins → `SITE_MODERATOR` only).
2. If the email already has a `User`: create the `SiteMember` immediately (no invite row).
3. Else: upsert a `SiteInvite(PENDING)` (`@@unique([siteId, email])` → re-invite updates role).
4. On the invitee's next sign-in, `events.signIn` → `claimPendingInvites` materializes membership and marks the invite `ACCEPTED`.
5. Revoke: `revokeInvite` sets status `REVOKED` (pending) or `removeMember` (already joined).

## 10. Team-management UI

- New page under site detail: `app/dashboard/sites/[siteId]/team` (tab in the site detail nav).
- Contents: members list with role badges, invite form (email + role select whose options are filtered by the caller's `GRANTABLE_SITE_ROLES`), change-role and remove actions, pending-invites list with revoke. The owner row is non-editable.
- shadcn/ui components only; Tailwind v4 utilities; no Radix primitives, no per-component CSS.
- Backed by thin route handlers: `/api/v1/sites/[siteId]/members` (GET/PATCH/DELETE) and `/api/v1/sites/[siteId]/invites` (GET/POST/DELETE), each capability-gated through `membership-service`.

## 11. Migration & data backfill

Follow `.agents/instructions/database-schema-and-migrations.md`: edit schema → `npx prisma validate` → `pnpm db:migrate --name rbac_roles` → review generated SQL → `pnpm db:generate` → verify.

Migration steps:
1. Create `PlatformRole`, `SiteRole`, `InviteStatus` enums; create `SiteMember`, `SiteInvite`; add `User.platformRole` (default `PLATFORM_USER`); drop `User.role` and `enum Role`.
2. **Backfill SQL** in the migration: insert one `SiteMember(role = SITE_OWNER, userId = Site.ownerId)` per existing `Site`.
3. **Bootstrap** the earliest-`createdAt` `User` to `PLATFORM_OWNER` (applies the "first user" rule to pre-existing data).

Never edit an applied migration; new changes get a new migration.

## 12. Verification

No test runner is configured. Verification = `pnpm typecheck` + `pnpm lint`, plus manual flows:

- Invite an email without an account → that user signs in → membership auto-claimed (`ACCEPTED`).
- `SITE_MODERATOR` can moderate but cannot reach site settings or the team tab.
- `SITE_ADMIN` can edit settings + invite/remove moderators, but cannot invite admins, delete, or transfer.
- `SITE_OWNER` can delete/transfer; transfer keeps the `ownerId`/owner-`SiteMember` invariant.
- `PLATFORM_USER` does not see Notice Board / Administration / Settings in the sidebar, and is redirected by `proxy.ts` if hitting those URLs directly.
- First registered user on a fresh install becomes `PLATFORM_OWNER`.

## 13. Out of scope

- Email delivery of invites (invites are claimed on sign-in, not emailed). Can layer on later via the existing `lib/email` infra.
- Widget-side roles — unchanged.
- Per-page or per-comment granular permissions.
