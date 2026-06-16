# RBAC Roles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add platform-level and per-site role-based access control (RBAC) to the OpenRemark admin side, governed by a single source-of-truth permission module.

**Architecture:** A dependency-free `lib/permissions.ts` encodes every role→capability rule. A new `SiteMember` join table makes sites multi-member (owner keeps a `SiteMember(SITE_OWNER)` row; `Site.ownerId` stays as the denormalized authoritative pointer). All services authorize through `membership-service.ts`, route handlers stay thin, edge middleware gates platform routes from the JWT, and an invite-by-email flow auto-activates on sign-in.

**Tech Stack:** Next.js 16 (App Router), Auth.js v5, Prisma + PostgreSQL, Zod, shadcn/ui, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-06-16-rbac-roles-design.md`

**Testing note:** This repo has **no test runner** (per CLAUDE.md). TDD-style unit tests are replaced by: `pnpm typecheck` + `pnpm lint` after each task, plus the explicit manual verification listed per task. Do not add a test framework.

---

## File Structure

**New files**
- `lib/permissions.ts` — SSOT: role/capability types, permission matrices, route map, grant rules.
- `lib/services/membership-service.ts` — membership + invite business logic (only file besides existing services that imports `lib/db.ts`).
- `lib/validators/member.ts` — Zod schemas for invite/role-change payloads.
- `types/next-auth.d.ts` — augments Auth.js `Session`/`JWT` with `platformRole`.
- `app/api/v1/sites/[siteId]/members/route.ts` — GET list, PATCH change-role, DELETE remove.
- `app/api/v1/sites/[siteId]/invites/route.ts` — GET list, POST create, DELETE revoke.
- `app/dashboard/sites/[siteId]/team/page.tsx` + `loading.tsx` — team management page.
- `components/dashboard/team/team-manager.tsx` — client UI (members table + invite form + pending invites).

**Modified files**
- `prisma/schema.prisma` — enums, `SiteMember`, `SiteInvite`, `User.platformRole`; drop `Role`/`User.role`.
- `lib/auth.config.ts` — pure session callback (copies `platformRole`) + platform-route gating in `authorized`.
- `lib/auth.ts` — `jwt` callback loads `platformRole`; `events.createUser` bootstrap; `events.signIn` claims invites.
- `lib/services/site-service.ts` — membership-aware reads + capability-gated mutations + transactional create/transfer.
- `lib/services/page-service.ts`, `lib/services/moderation-service.ts` — capability gating.
- `lib/services/comment-service.ts` — expose comment→site resolution for moderation gating (read below).
- `app/dashboard/layout.tsx` + `components/dashboard/app-sidebar.tsx` — platform-role sidebar gating.
- `components/dashboard/site-sub-nav.tsx` + `app/dashboard/sites/[siteId]/layout.tsx` — Team tab + role wiring.
- Read/mutation call sites enumerated in Task 8/9.

---

## Task 1: Permission single source of truth

**Files:**
- Create: `lib/permissions.ts`

- [ ] **Step 1: Write the module**

```ts
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

const PLATFORM_PERMISSIONS: Record<PlatformRole, readonly PlatformCapability[]> =
  {
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
export type GrantableSiteRole = Extract<SiteRole, "SITE_ADMIN" | "SITE_MODERATOR">

// Which capability is required to grant/remove a given role.
export const ROLE_GRANT_CAPABILITY: Record<GrantableSiteRole, SiteCapability> = {
  SITE_ADMIN: "MANAGE_ADMINS",
  SITE_MODERATOR: "MANAGE_MODERATORS",
}

// Roles a given site role may grant — consumed by the invite form (SSOT for UI).
export const GRANTABLE_SITE_ROLES: Record<SiteRole, readonly GrantableSiteRole[]> =
  {
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
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add lib/permissions.ts
git commit -m "feat(authz): add permissions single source of truth"
```

---

## Task 2: Schema + migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: migration under `prisma/migrations/` (generated)

- [ ] **Step 1: Replace the `Role` enum and edit `User`**

In `prisma/schema.prisma`, delete:
```prisma
enum Role {
  OWNER
  ADMIN
}
```
Add the new enums in the Enums section:
```prisma
enum PlatformRole {
  PLATFORM_OWNER
  PLATFORM_USER
}

enum SiteRole {
  SITE_OWNER
  SITE_ADMIN
  SITE_MODERATOR
}

enum InviteStatus {
  PENDING
  ACCEPTED
  REVOKED
}
```
In `model User`, replace `role Role @default(OWNER)` with:
```prisma
  platformRole PlatformRole @default(PLATFORM_USER)
```
and add to the relations block:
```prisma
  memberships SiteMember[]
```

- [ ] **Step 2: Add relations to `Site` and the two new models**

In `model Site`, add to the relations block (near `pages`/`bannedCommenters`):
```prisma
  members SiteMember[]
  invites SiteInvite[]
```
Add the two models after `BannedCommenter`:
```prisma
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
  email       String
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

- [ ] **Step 2b: Add backfill SQL to the generated migration**

After running the migrate command in Step 3, but **before** applying to other environments, open the newly generated migration file under `prisma/migrations/<timestamp>_rbac_roles/migration.sql` and append:
```sql
-- Backfill: every existing site's owner becomes a SITE_OWNER member.
INSERT INTO "SiteMember" ("id", "userId", "siteId", "role", "createdAt", "updatedAt")
SELECT gen_random_uuid(), s."ownerId", s."id", 'SITE_OWNER', NOW(), NOW()
FROM "Site" s;

-- Bootstrap: the earliest-registered user becomes PLATFORM_OWNER.
UPDATE "User"
SET "platformRole" = 'PLATFORM_OWNER'
WHERE "id" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1);
```
(`gen_random_uuid()` is available in Postgres; cuid mismatch is acceptable for backfilled PKs since the column is just a unique id. If `pgcrypto` is unavailable, substitute `md5(random()::text || s."id")`.)

- [ ] **Step 3: Validate, migrate, generate**

Run:
```bash
npx prisma validate
pnpm db:migrate --name rbac_roles
# edit migration.sql per Step 2b is interleaved: prisma creates the file before applying.
# If prisma already applied without the backfill, run a follow-up SQL migration instead of editing the applied one.
pnpm db:generate
```
Expected: schema valid; migration applies; client regenerated. Review the generated SQL drops the old `Role` enum and creates the new tables/indexes.

> If `pnpm db:migrate` applies before you can edit the file, do NOT edit the applied migration. Instead create a second migration `pnpm db:migrate --name rbac_backfill` containing only the two SQL statements from Step 2b.

- [ ] **Step 4: Verify**

Run: `pnpm typecheck`
Expected: errors are now expected in services that referenced `User.role` or `getSitesByOwner` — that's fine; Tasks 3–9 fix them. Confirm Prisma client exposes `db.siteMember` / `db.siteInvite` (open `generated/prisma/client` types or `pnpm db:studio`).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations generated/prisma
git commit -m "feat(db): add SiteMember, SiteInvite, PlatformRole; drop unused Role"
```

---

## Task 3: Membership service

**Files:**
- Create: `lib/services/membership-service.ts`

- [ ] **Step 1: Write the service**

```ts
// lib/services/membership-service.ts
import { db } from "@/lib/db"
import { ApiError } from "@/lib/api/error"
import {
  siteCan,
  ROLE_GRANT_CAPABILITY,
  type SiteCapability,
  type GrantableSiteRole,
} from "@/lib/permissions"

export async function getMembership(userId: string, siteId: string) {
  return db.siteMember.findUnique({
    where: { userId_siteId: { userId, siteId } },
  })
}

/** Read access for any member; throws 404 if the user is not a member. */
export async function getSiteForMember(siteId: string, userId: string) {
  const membership = await getMembership(userId, siteId)
  if (!membership) throw new ApiError("Site not found", 404)
  const site = await db.site.findUnique({ where: { id: siteId } })
  if (!site) throw new ApiError("Site not found", 404)
  return { site, role: membership.role }
}

/** Guard a capability; returns the loaded site + membership. */
export async function requireSiteAccess(
  siteId: string,
  userId: string,
  capability: SiteCapability
) {
  const membership = await getMembership(userId, siteId)
  if (!membership) throw new ApiError("Site not found", 404)
  if (!siteCan(membership.role, capability)) {
    throw new ApiError("Forbidden", 403)
  }
  const site = await db.site.findUnique({ where: { id: siteId } })
  if (!site) throw new ApiError("Site not found", 404)
  return { site, membership }
}

export async function listMembers(siteId: string) {
  return db.siteMember.findMany({
    where: { siteId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  })
}

export async function listPendingInvites(siteId: string) {
  return db.siteInvite.findMany({
    where: { siteId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  })
}

/**
 * Invite by email. If the email already has an account, membership is created
 * immediately; otherwise a PENDING invite is stored (claimed on next sign-in).
 */
export async function createInvite(
  siteId: string,
  inviterUserId: string,
  email: string,
  role: GrantableSiteRole
) {
  await requireSiteAccess(siteId, inviterUserId, ROLE_GRANT_CAPABILITY[role])
  const normalized = email.toLowerCase()

  const existing = await db.user.findUnique({ where: { email: normalized } })
  if (existing) {
    const current = await getMembership(existing.id, siteId)
    if (current?.role === "SITE_OWNER") {
      throw new ApiError("That user owns this site", 400)
    }
    await db.siteMember.upsert({
      where: { userId_siteId: { userId: existing.id, siteId } },
      create: { siteId, userId: existing.id, role },
      update: { role },
    })
    return { status: "added" as const }
  }

  await db.siteInvite.upsert({
    where: { siteId_email: { siteId, email: normalized } },
    create: {
      siteId,
      email: normalized,
      role,
      invitedById: inviterUserId,
      status: "PENDING",
    },
    update: { role, status: "PENDING", invitedById: inviterUserId },
  })
  return { status: "invited" as const }
}

export async function changeRole(
  siteId: string,
  actingUserId: string,
  targetUserId: string,
  newRole: GrantableSiteRole
) {
  const { membership: actor } = await requireSiteAccess(
    siteId,
    actingUserId,
    ROLE_GRANT_CAPABILITY[newRole]
  )
  const target = await getMembership(targetUserId, siteId)
  if (!target) throw new ApiError("Member not found", 404)
  if (target.role === "SITE_OWNER") {
    throw new ApiError("Cannot change the owner's role", 400)
  }
  // Touching an existing admin additionally requires MANAGE_ADMINS.
  if (target.role === "SITE_ADMIN" && !siteCan(actor.role, "MANAGE_ADMINS")) {
    throw new ApiError("Forbidden", 403)
  }
  return db.siteMember.update({
    where: { userId_siteId: { userId: targetUserId, siteId } },
    data: { role: newRole },
  })
}

export async function removeMember(
  siteId: string,
  actingUserId: string,
  targetUserId: string
) {
  const { membership: actor } = await requireSiteAccess(
    siteId,
    actingUserId,
    "MANAGE_MODERATORS"
  )
  const target = await getMembership(targetUserId, siteId)
  if (!target) throw new ApiError("Member not found", 404)
  if (target.role === "SITE_OWNER") {
    throw new ApiError("Cannot remove the owner", 400)
  }
  if (target.role === "SITE_ADMIN" && !siteCan(actor.role, "MANAGE_ADMINS")) {
    throw new ApiError("Forbidden", 403)
  }
  await db.siteMember.delete({
    where: { userId_siteId: { userId: targetUserId, siteId } },
  })
}

export async function revokeInvite(
  siteId: string,
  actingUserId: string,
  inviteId: string
) {
  const invite = await db.siteInvite.findFirst({
    where: { id: inviteId, siteId },
  })
  if (!invite || invite.status !== "PENDING") {
    throw new ApiError("Invite not found", 404)
  }
  // invite.role is SITE_ADMIN | SITE_MODERATOR (never SITE_OWNER for invites).
  await requireSiteAccess(
    siteId,
    actingUserId,
    ROLE_GRANT_CAPABILITY[invite.role as GrantableSiteRole]
  )
  await db.siteInvite.update({
    where: { id: inviteId },
    data: { status: "REVOKED" },
  })
}

/** Called from auth `events.signIn`; materializes any pending invites. */
export async function claimPendingInvites(userId: string, email: string) {
  const normalized = email.toLowerCase()
  const invites = await db.siteInvite.findMany({
    where: { email: normalized, status: "PENDING" },
  })
  if (invites.length === 0) return

  await db.$transaction([
    ...invites.map((inv) =>
      db.siteMember.upsert({
        where: { userId_siteId: { userId, siteId: inv.siteId } },
        // Never demote an existing owner via a stale invite.
        create: { siteId: inv.siteId, userId, role: inv.role },
        update: {},
      })
    ),
    ...invites.map((inv) =>
      db.siteInvite.update({
        where: { id: inv.id },
        data: { status: "ACCEPTED" },
      })
    ),
  ])
}
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck`
Expected: no NEW errors from this file (pre-existing errors in other services from Task 2 remain until their tasks).

- [ ] **Step 3: Commit**

```bash
git add lib/services/membership-service.ts
git commit -m "feat(authz): add membership service (roles, invites, guards)"
```

---

## Task 4: Refactor site/page/moderation services

**Files:**
- Modify: `lib/services/site-service.ts`
- Modify: `lib/services/page-service.ts`
- Modify: `lib/services/moderation-service.ts`

- [ ] **Step 1: `site-service.ts` — membership-aware reads + transactional writes**

Replace the imports/top of the file and the relevant functions:
```ts
import { db } from "@/lib/db"
import { ApiError } from "@/lib/api/error"
import { CommentStatus } from "@/generated/prisma/client"
import type { CreateSiteInput, UpdateSiteInput } from "@/lib/validators/site"
import { lookupUserByEmail } from "@/lib/services/user-service"
import {
  requireSiteAccess,
  getSiteForMember,
} from "@/lib/services/membership-service"

export async function getSiteCountForUser(userId: string) {
  return db.site.count({ where: { members: { some: { userId } } } })
}

export async function getSitesForUser(userId: string) {
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  const [sites, pendingByPage, recentActivity] = await Promise.all([
    db.site.findMany({
      where: { members: { some: { userId } } },
      include: {
        _count: { select: { pages: true } },
        pages: { select: { id: true, _count: { select: { comments: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.comment.groupBy({
      by: ["pageId"],
      where: {
        status: CommentStatus.PENDING,
        page: { site: { members: { some: { userId } } } },
      },
      _count: { _all: true },
    }),
    db.comment.findMany({
      where: {
        page: { site: { members: { some: { userId } } } },
        createdAt: { gte: twoWeeksAgo },
      },
      select: { createdAt: true, page: { select: { siteId: true } } },
    }),
  ])
  // ...keep the existing aggregation body unchanged below this point...
```
Keep the rest of `getSitesForUser`'s aggregation body exactly as the old `getSitesByOwner` had it (the `pendingByPageId`/`days`/`activityBySite`/`return sites.map(...)` block is identical).

Replace `getSiteByIdForOwner` with a thin re-export wrapper so existing read call sites keep working, plus capability-gated mutations:
```ts
// Read access for any member (replaces getSiteByIdForOwner for reads).
export async function getSiteByIdForUser(siteId: string, userId: string) {
  const { site } = await getSiteForMember(siteId, userId)
  return site
}

export async function getSiteBySiteKey(siteKey: string) {
  const site = await db.site.findUnique({ where: { siteKey } })
  if (!site) throw new ApiError("Site not found", 404)
  return site
}

export async function createSite(ownerId: string, input: CreateSiteInput) {
  return db.$transaction(async (tx) => {
    const site = await tx.site.create({
      data: {
        name: input.name,
        domain: input.domain,
        autoApprove: input.autoApprove,
        allowedOrigins: JSON.stringify(input.allowedOrigins),
        theme: input.theme,
        primaryColor: input.primaryColor,
        radius: input.radius,
        ownerId,
      },
    })
    await tx.siteMember.create({
      data: { siteId: site.id, userId: ownerId, role: "SITE_OWNER" },
    })
    return site
  })
}

export async function updateSite(
  siteId: string,
  userId: string,
  input: UpdateSiteInput
) {
  await requireSiteAccess(siteId, userId, "MANAGE_SETTINGS")
  return db.site.update({
    where: { id: siteId },
    data: {
      // ...keep the existing conditional-spread data block unchanged...
    },
  })
}

export async function deleteSite(siteId: string, userId: string) {
  await requireSiteAccess(siteId, userId, "DELETE_SITE")
  await db.site.delete({ where: { id: siteId } })
}

export async function transferSite(
  siteId: string,
  currentUserId: string,
  newOwnerEmail: string
) {
  await requireSiteAccess(siteId, currentUserId, "TRANSFER_SITE")
  const newOwner = await lookupUserByEmail(newOwnerEmail)
  if (newOwner.id === currentUserId) {
    throw new ApiError("Cannot transfer to yourself", 400)
  }
  return db.$transaction(async (tx) => {
    // Demote current owner to admin (retains access).
    await tx.siteMember.update({
      where: { userId_siteId: { userId: currentUserId, siteId } },
      data: { role: "SITE_ADMIN" },
    })
    // Promote / create the new owner's membership.
    await tx.siteMember.upsert({
      where: { userId_siteId: { userId: newOwner.id, siteId } },
      create: { siteId, userId: newOwner.id, role: "SITE_OWNER" },
      update: { role: "SITE_OWNER" },
    })
    return tx.site.update({
      where: { id: siteId },
      data: { ownerId: newOwner.id },
    })
  })
}
```
Keep the `updateSite` data block (all the conditional spreads `...(input.name && ...)` etc.) exactly as it was in the original file.

- [ ] **Step 2: `page-service.ts` — gate page deletion**

```ts
import { cache } from "react"
import { db } from "@/lib/db"
import { ApiError } from "@/lib/api/error"
import { requireSiteAccess } from "@/lib/services/membership-service"

export const getPagesForSite = cache(async (siteId: string) => {
  return db.page.findMany({
    where: { siteId },
    include: { _count: { select: { comments: true } } },
    orderBy: { createdAt: "desc" },
  })
})

export async function deletePage(siteId: string, pageId: string, userId: string) {
  await requireSiteAccess(siteId, userId, "MANAGE_SETTINGS")
  const page = await db.page.findFirst({ where: { id: pageId, siteId } })
  if (!page) throw new ApiError("Page not found", 404)
  await db.page.delete({ where: { id: pageId } })
}
```

- [ ] **Step 3: `moderation-service.ts` — overview by membership + comment→site helper**

Rename `getOwnerOverview(ownerId)` to `getUserOverview(userId)` and change its top query `where: { ownerId }` to `where: { members: { some: { userId } } }`. Keep the rest of the body identical (it derives `siteIds` from `allSites`).

Add a helper used by moderation route gating (Task 8):
```ts
export async function getSiteIdForComment(commentId: string): Promise<string> {
  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { page: { select: { siteId: true } } },
  })
  if (!comment) throw new ApiError("Comment not found", 404)
  return comment.page.siteId
}
```
(Add `import { ApiError } from "@/lib/api/error"` if not already present.)

- [ ] **Step 4: Verify**

Run: `pnpm typecheck`
Expected: remaining errors are only in the **call sites** that still use old names (`getSiteByIdForOwner`, `getSitesByOwner`, `getSiteCountByOwner`, `getOwnerOverview`) — fixed in Tasks 7–9.

- [ ] **Step 5: Commit**

```bash
git add lib/services/site-service.ts lib/services/page-service.ts lib/services/moderation-service.ts
git commit -m "feat(authz): gate site/page/moderation services by capability"
```

---

## Task 5: Auth session plumbing + bootstrap + invite claiming

**Files:**
- Create: `types/next-auth.d.ts`
- Modify: `lib/auth.config.ts`
- Modify: `lib/auth.ts`

- [ ] **Step 1: Augment Auth.js types**

```ts
// types/next-auth.d.ts
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
```

- [ ] **Step 2: `auth.config.ts` — pure session callback + platform route gating**

```ts
import type { NextAuthConfig } from "next-auth"
import { NextResponse } from "next/server"
import Google from "next-auth/providers/google"
import {
  PLATFORM_ROUTE_CAPABILITY,
  platformCan,
  type PlatformRole,
} from "@/lib/permissions"

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

      // Platform-route gating (edge-safe: reads platformRole from the session/token).
      const matched = Object.keys(PLATFORM_ROUTE_CAPABILITY).find(
        (route) => path === route || path.startsWith(route + "/")
      )
      if (matched) {
        const role: PlatformRole = auth?.user?.platformRole ?? "PLATFORM_USER"
        if (!platformCan(role, PLATFORM_ROUTE_CAPABILITY[matched])) {
          return NextResponse.redirect(new URL("/dashboard", nextUrl))
        }
      }
      return true
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub
      session.user.platformRole =
        (token.platformRole as PlatformRole) ?? "PLATFORM_USER"
      return session
    },
  },
} satisfies NextAuthConfig
```

- [ ] **Step 3: `lib/auth.ts` — jwt loads role, events bootstrap + claim invites**

```ts
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
        token.platformRole = (u?.platformRole ?? "PLATFORM_USER") as PlatformRole
      }
      return token
    },
  },
  events: {
    async createUser({ user }) {
      // First-ever user bootstraps as PLATFORM_OWNER.
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
```

- [ ] **Step 4: Verify**

Run: `pnpm typecheck`
Expected: PASS for these three files (the `session.user.platformRole` access elsewhere now type-checks).

- [ ] **Step 5: Commit**

```bash
git add types/next-auth.d.ts lib/auth.config.ts lib/auth.ts
git commit -m "feat(auth): platformRole in session, owner bootstrap, invite claiming"
```

---

## Task 6: Sidebar platform-role gating

**Files:**
- Modify: `app/dashboard/layout.tsx`
- Modify: `components/dashboard/app-sidebar.tsx`

- [ ] **Step 1: Pass `platformRole` from layout, fix renamed service**

In `app/dashboard/layout.tsx`:
```ts
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { getSiteCountForUser } from "@/lib/services/site-service"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/sign-in")

  const siteCount = await getSiteCountForUser(session.user.id)

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          user={session.user}
          siteCount={siteCount}
          platformRole={session.user.platformRole}
        />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
```

- [ ] **Step 2: Gate the System group + Settings in the sidebar**

In `components/dashboard/app-sidebar.tsx`:
- Add to imports: `import { platformCan, type PlatformRole } from "@/lib/permissions"`
- Extend `Props`:
```ts
type Props = {
  user: { name?: string | null; email?: string | null; image?: string | null }
  siteCount: number
  platformRole: PlatformRole
}
```
- Change the signature: `export function AppSidebar({ user, siteCount, platformRole }: Props) {`
- After building `navGroups`, filter platform-only items. Replace the `"My Account"` group's `Settings` item and the `"System"` group so they only appear for the relevant capability:
```ts
const isPlatformOwner = platformCan(platformRole, "VIEW_ADMINISTRATION")

const navGroups: NavGroup[] = [
  {
    label: "Application",
    items: [
      { label: "Overview", href: "/dashboard", icon: RiDashboardLine },
      { label: "Sites", href: "/dashboard/sites", icon: RiGlobalLine, badge: siteCount },
    ],
  },
  {
    label: "My Account",
    items: [
      { label: "Profile", href: "/dashboard/account", icon: RiUserLine },
      ...(platformCan(platformRole, "MANAGE_PLATFORM_SETTINGS")
        ? [{ label: "Settings", href: "/dashboard/settings", icon: RiSettingsLine }]
        : []),
    ],
  },
  ...(isPlatformOwner
    ? [
        {
          label: "System",
          items: [
            { label: "Notice Board", href: "/dashboard/notice-board", icon: RiMegaphoneLine },
            { label: "Administration", href: "/dashboard/administration", icon: RiShieldUserLine },
          ],
        },
      ]
    : []),
]
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 4: Manual check**

Run `pnpm dev`. As the first/bootstrap user (PLATFORM_OWNER) you should see Settings + System group. (Full role-switch verification happens in Task 11.)

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/layout.tsx components/dashboard/app-sidebar.tsx
git commit -m "feat(dashboard): gate platform nav by platformRole"
```

---

## Task 7: Fix remaining renamed-service call sites (dashboard reads)

**Files:**
- Modify: `app/dashboard/page.tsx`
- Modify: `app/dashboard/sites/page.tsx`
- Modify: `app/(dashboard)/layout.tsx`
- Modify: `app/api/v1/sites/route.ts`

- [ ] **Step 1: Replace old names**

In each file, replace usages:
- `getSitesByOwner(<id>)` → `getSitesForUser(<id>)`
- `getSiteCountByOwner(<id>)` → `getSiteCountForUser(<id>)`
- `getOwnerOverview(<id>)` → `getUserOverview(<id>)`
- update the matching `import { ... } from "@/lib/services/site-service"` / `moderation-service`.

Identify the exact symbol each file imports by reading its current import block, then swap to the new name. (These are pure renames — the argument is still the current user's id, `session.user.id`.)

- [ ] **Step 2: Verify**

Run: `pnpm typecheck`
Expected: no remaining references to the old function names:
```bash
grep -rn "getSitesByOwner\|getSiteCountByOwner\|getOwnerOverview" app lib
```
Expected: empty output.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/page.tsx app/dashboard/sites/page.tsx "app/(dashboard)/layout.tsx" app/api/v1/sites/route.ts
git commit -m "refactor(authz): point dashboard reads at membership-scoped services"
```

---

## Task 8: Site read/mutation route gating

**Files:**
- Modify: `app/api/v1/sites/[siteId]/route.ts`
- Modify: `app/api/v1/sites/[siteId]/users/route.ts`
- Modify: `app/api/v1/sites/[siteId]/users/[commenterId]/route.ts`
- Modify: `app/api/v1/sites/[siteId]/users/[commenterId]/comments/route.ts`
- Modify: `app/api/v1/sites/[siteId]/users/[commenterId]/ban/route.ts`
- Modify: `app/api/v1/sites/[siteId]/email-preview/route.ts`
- Modify: `app/api/v1/sites/[siteId]/pages/[pageId]/route.ts`
- Modify: `app/api/v1/comments/[id]/route.ts`
- Modify: `app/api/v1/comments/route.ts`

- [ ] **Step 1: Apply the right guard per route**

For each route, replace the `getSiteByIdForOwner(siteId, session.user.id)` authorization line with the membership guard matching the action:

| Route | Action | Guard |
|---|---|---|
| `sites/[siteId]` GET | read site | `getSiteByIdForUser(siteId, userId)` (from `site-service`) |
| `sites/[siteId]` PATCH | edit settings | gated inside `updateSite` (already) — keep call |
| `sites/[siteId]` DELETE | delete | gated inside `deleteSite` (already) — keep call |
| `sites/[siteId]/users` GET | list commenters | `await requireSiteAccess(siteId, userId, "MODERATE")` |
| `users/[commenterId]` DELETE | delete commenter comments | `requireSiteAccess(..., "MODERATE")` |
| `users/[commenterId]/comments` GET | read | `requireSiteAccess(..., "MODERATE")` |
| `users/[commenterId]/ban` POST/DELETE | ban/unban | `requireSiteAccess(..., "MODERATE")` |
| `email-preview` | preview email config | `requireSiteAccess(..., "MANAGE_SETTINGS")` |
| `pages/[pageId]` DELETE | delete page | gated inside `deletePage` (already) — keep call |

Concrete example for `sites/[siteId]/route.ts` GET (swap import + call):
```ts
import { getSiteByIdForUser, updateSite, deleteSite } from "@/lib/services/site-service"
// ...
const site = await getSiteByIdForUser(siteId, session.user.id)
```
Concrete example for a moderation/ban route — add the guard before the action:
```ts
import { requireSiteAccess } from "@/lib/services/membership-service"
// ...
if (!session?.user?.id) throw new ApiError("Unauthorized", 401)
await requireSiteAccess(siteId, session.user.id, "MODERATE")
// ...existing service call...
```

- [ ] **Step 2: Close the comment-moderation authz gap**

`comments/[id]/route.ts` (PATCH) and `comments/route.ts` (PATCH) currently moderate without verifying site membership. Add resolution + guard.

In `comments/[id]/route.ts`, before calling `moderateComment`/`updateCommentBody`:
```ts
import { requireSiteAccess } from "@/lib/services/membership-service"
import { getSiteIdForComment } from "@/lib/services/moderation-service"
// ...
if (!session?.user?.id) throw new ApiError("Unauthorized", 401)
const siteId = await getSiteIdForComment(id)
await requireSiteAccess(siteId, session.user.id, "MODERATE")
```
(Note: the route currently checks `session.user.email`; keep `email` for the `adminEmail` arg but also require `session.user.id` for the guard.)

In `comments/route.ts` PATCH (bulk), resolve every comment's site and require MODERATE on each distinct site:
```ts
import { requireSiteAccess } from "@/lib/services/membership-service"
import { db } from "@/lib/db" // NOTE: route handlers normally must not import db.
```
Because the layered rule forbids route handlers importing `lib/db.ts`, instead add a service helper in `moderation-service.ts`:
```ts
export async function getSiteIdsForComments(ids: string[]): Promise<string[]> {
  const rows = await db.comment.findMany({
    where: { id: { in: ids } },
    select: { page: { select: { siteId: true } } },
  })
  return [...new Set(rows.map((r) => r.page.siteId))]
}
```
Then in the route:
```ts
import { requireSiteAccess } from "@/lib/services/membership-service"
import { getSiteIdsForComments } from "@/lib/services/moderation-service"
// ...
if (!session?.user?.id) throw new ApiError("Unauthorized", 401)
const siteIds = await getSiteIdsForComments(parsed.data.ids)
for (const siteId of siteIds) {
  await requireSiteAccess(siteId, session.user.id, "MODERATE")
}
await bulkModerate(parsed.data.ids, parsed.data.status, session.user.email)
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS. Then:
```bash
grep -rn "getSiteByIdForOwner" app lib
```
Expected: empty (only `getSiteByIdForUser` / `requireSiteAccess` remain).

- [ ] **Step 4: Commit**

```bash
git add app/api/v1 lib/services/moderation-service.ts
git commit -m "feat(authz): capability-gate site + comment API routes"
```

---

## Task 9: Dashboard site pages — read gating + Team tab

**Files:**
- Modify: `app/dashboard/sites/[siteId]/layout.tsx`
- Modify: `app/dashboard/sites/[siteId]/page.tsx`
- Modify: `app/dashboard/sites/[siteId]/comments/page.tsx`
- Modify: `app/dashboard/sites/[siteId]/users/page.tsx`
- Modify: `app/dashboard/sites/[siteId]/settings/page.tsx`
- Modify: `app/dashboard/sites/[siteId]/install/page.tsx`
- Modify: `components/dashboard/site-sub-nav.tsx`

- [ ] **Step 1: Layout — load membership, pass role to sub-nav**

In `app/dashboard/sites/[siteId]/layout.tsx`:
```ts
import { auth } from "@/lib/auth"
import { notFound } from "next/navigation"
import { getSiteForMember } from "@/lib/services/membership-service"
import { SiteSubNav } from "@/components/dashboard/site-sub-nav"

type Props = {
  children: React.ReactNode
  params: Promise<{ siteId: string }>
}

export default async function SiteLayout({ children, params }: Props) {
  const { siteId } = await params
  const session = await auth()

  let site, role
  try {
    const res = await getSiteForMember(siteId, session!.user!.id)
    site = res.site
    role = res.role
  } catch {
    notFound()
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SiteSubNav
        siteId={siteId}
        siteName={site.name}
        siteDomain={site.domain}
        role={role}
      />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  )
}
```

- [ ] **Step 2: Read pages — swap to membership helpers**

In `page.tsx`, `comments/page.tsx`, `users/page.tsx`: replace `getSiteByIdForOwner(siteId, session.user.id)` with `getSiteForMember(siteId, session.user.id)` (import from `@/lib/services/membership-service`) and read `.site` from the result. Example:
```ts
import { getSiteForMember } from "@/lib/services/membership-service"
// ...
const { site } = await getSiteForMember(siteId, session!.user!.id)
```

In `settings/page.tsx` and `install/page.tsx` (settings-tier pages): gate with capability so moderators get `notFound`:
```ts
import { requireSiteAccess } from "@/lib/services/membership-service"
import { notFound } from "next/navigation"
// ...
let site
try {
  const res = await requireSiteAccess(siteId, session!.user!.id, "MANAGE_SETTINGS")
  site = res.site
} catch {
  notFound()
}
```

- [ ] **Step 3: Sub-nav — add capability-gated Team + Settings tabs**

In `components/dashboard/site-sub-nav.tsx`:
- Add imports: `import { siteCan, type SiteRole } from "@/lib/permissions"` and `RiTeamLine` to the remixicon import.
- Extend `Props` with `role: SiteRole`.
- Replace the static `TABS` constant with a per-render computed list that filters by capability:
```ts
export function SiteSubNav({ siteId, siteName, siteDomain, role }: Props) {
  const pathname = usePathname()

  const tabs = [
    { label: "Overview", href: "", icon: RiDashboardLine, show: true },
    { label: "Comments", href: "/comments", icon: RiMessage2Line, show: true },
    { label: "Users", href: "/users", icon: RiUserLine, show: true },
    { label: "Team", href: "/team", icon: RiTeamLine, show: siteCan(role, "MANAGE_MODERATORS") },
    { label: "Install", href: "/install", icon: RiCodeSSlashLine, show: siteCan(role, "MANAGE_SETTINGS") },
    { label: "Settings", href: "/settings", icon: RiSettingsLine, show: siteCan(role, "MANAGE_SETTINGS") },
  ].filter((t) => t.show)
  // ...keep isActive + JSX, mapping over `tabs` instead of `TABS`...
}
```
Keep the rest of the component (breadcrumb, `isActive`, the `.map` render) unchanged except mapping over `tabs`.

- [ ] **Step 4: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/sites components/dashboard/site-sub-nav.tsx
git commit -m "feat(dashboard): membership-gate site pages, add Team tab"
```

---

## Task 10: Team management API + UI

**Files:**
- Create: `lib/validators/member.ts`
- Create: `app/api/v1/sites/[siteId]/members/route.ts`
- Create: `app/api/v1/sites/[siteId]/invites/route.ts`
- Create: `app/dashboard/sites/[siteId]/team/page.tsx`
- Create: `app/dashboard/sites/[siteId]/team/loading.tsx`
- Create: `components/dashboard/team/team-manager.tsx`

- [ ] **Step 1: Validators**

```ts
// lib/validators/member.ts
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
```

- [ ] **Step 2: Members route**

```ts
// app/api/v1/sites/[siteId]/members/route.ts
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"
import { ChangeRoleSchema, RemoveMemberSchema } from "@/lib/validators/member"
import {
  listMembers,
  changeRole,
  removeMember,
} from "@/lib/services/membership-service"
import { handleApiError, ApiError } from "@/lib/api/error"
import { ok, noContent } from "@/lib/api/response"

type Params = { params: Promise<{ siteId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { siteId } = await params
    const session = await auth()
    if (!session?.user?.id) throw new ApiError("Unauthorized", 401)
    const members = await listMembers(siteId)
    return ok(members)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { siteId } = await params
    const session = await auth()
    if (!session?.user?.id) throw new ApiError("Unauthorized", 401)
    const parsed = ChangeRoleSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 422 })
    }
    const member = await changeRole(
      siteId,
      session.user.id,
      parsed.data.userId,
      parsed.data.role
    )
    revalidatePath(`/dashboard/sites/${siteId}/team`)
    return ok(member)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { siteId } = await params
    const session = await auth()
    if (!session?.user?.id) throw new ApiError("Unauthorized", 401)
    const parsed = RemoveMemberSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 422 })
    }
    await removeMember(siteId, session.user.id, parsed.data.userId)
    revalidatePath(`/dashboard/sites/${siteId}/team`)
    return noContent()
  } catch (err) {
    return handleApiError(err)
  }
}
```

- [ ] **Step 3: Invites route**

```ts
// app/api/v1/sites/[siteId]/invites/route.ts
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"
import { CreateInviteSchema, RevokeInviteSchema } from "@/lib/validators/member"
import {
  listPendingInvites,
  createInvite,
  revokeInvite,
} from "@/lib/services/membership-service"
import { handleApiError, ApiError } from "@/lib/api/error"
import { ok, noContent } from "@/lib/api/response"

type Params = { params: Promise<{ siteId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { siteId } = await params
    const session = await auth()
    if (!session?.user?.id) throw new ApiError("Unauthorized", 401)
    const invites = await listPendingInvites(siteId)
    return ok(invites)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { siteId } = await params
    const session = await auth()
    if (!session?.user?.id) throw new ApiError("Unauthorized", 401)
    const parsed = CreateInviteSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 422 })
    }
    const result = await createInvite(
      siteId,
      session.user.id,
      parsed.data.email,
      parsed.data.role
    )
    revalidatePath(`/dashboard/sites/${siteId}/team`)
    return ok(result)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { siteId } = await params
    const session = await auth()
    if (!session?.user?.id) throw new ApiError("Unauthorized", 401)
    const parsed = RevokeInviteSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 422 })
    }
    await revokeInvite(siteId, session.user.id, parsed.data.inviteId)
    revalidatePath(`/dashboard/sites/${siteId}/team`)
    return noContent()
  } catch (err) {
    return handleApiError(err)
  }
}
```

- [ ] **Step 4: Team page (server component)**

```tsx
// app/dashboard/sites/[siteId]/team/page.tsx
import { auth } from "@/lib/auth"
import { notFound } from "next/navigation"
import {
  requireSiteAccess,
  listMembers,
  listPendingInvites,
} from "@/lib/services/membership-service"
import { GRANTABLE_SITE_ROLES } from "@/lib/permissions"
import { TeamManager } from "@/components/dashboard/team/team-manager"

type Props = { params: Promise<{ siteId: string }> }

export default async function TeamPage({ params }: Props) {
  const { siteId } = await params
  const session = await auth()

  let role
  try {
    const res = await requireSiteAccess(
      siteId,
      session!.user!.id,
      "MANAGE_MODERATORS"
    )
    role = res.membership.role
  } catch {
    notFound()
  }

  const [members, invites] = await Promise.all([
    listMembers(siteId),
    listPendingInvites(siteId),
  ])

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <TeamManager
        siteId={siteId}
        currentUserId={session!.user!.id}
        myRole={role}
        grantableRoles={[...GRANTABLE_SITE_ROLES[role]]}
        members={members.map((m) => ({
          userId: m.userId,
          role: m.role,
          name: m.user.name,
          email: m.user.email,
          image: m.user.image,
        }))}
        invites={invites.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role,
        }))}
      />
    </div>
  )
}
```

- [ ] **Step 5: Team loading skeleton**

```tsx
// app/dashboard/sites/[siteId]/team/loading.tsx
export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <div className="h-8 w-40 animate-pulse rounded bg-muted" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded bg-muted" />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Team manager client component**

Use shadcn/ui primitives already present in the repo (`Button`, `Input`, `Select`, `Avatar`, `Badge`, `Card`). If any of these are missing under `components/ui/`, add them with `pnpm dlx shadcn@latest add <name>` before writing this file.

```tsx
// components/dashboard/team/team-manager.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import type { SiteRole, GrantableSiteRole } from "@/lib/permissions"

type Member = {
  userId: string
  role: SiteRole
  name: string | null
  email: string | null
  image: string | null
}
type Invite = { id: string; email: string; role: SiteRole }

type Props = {
  siteId: string
  currentUserId: string
  myRole: SiteRole
  grantableRoles: GrantableSiteRole[]
  members: Member[]
  invites: Invite[]
}

const ROLE_LABEL: Record<SiteRole, string> = {
  SITE_OWNER: "Owner",
  SITE_ADMIN: "Admin",
  SITE_MODERATOR: "Moderator",
}

export function TeamManager({
  siteId,
  currentUserId,
  grantableRoles,
  members,
  invites,
}: Props) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<GrantableSiteRole>(
    grantableRoles[0] ?? "SITE_MODERATOR"
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send(method: string, path: string, body: unknown) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Request failed")
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Team</h1>
        <p className="text-sm text-muted-foreground">
          Manage who can moderate and administer this site.
        </p>
      </div>

      {/* Invite form */}
      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault()
          if (!email) return
          send("POST", `/api/v1/sites/${siteId}/invites`, { email, role }).then(
            () => setEmail("")
          )
        }}
      >
        <Input
          type="email"
          required
          placeholder="teammate@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1"
        />
        <Select value={role} onValueChange={(v) => setRole(v as GrantableSiteRole)}>
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {grantableRoles.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABEL[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" disabled={busy}>
          Invite
        </Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Members */}
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Members</h2>
        <ul className="divide-y rounded-md border">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center gap-3 p-3">
              <Avatar className="size-8">
                <AvatarImage src={m.image ?? ""} alt={m.name ?? ""} />
                <AvatarFallback>
                  {(m.name ?? m.email ?? "U").slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.name ?? m.email}</p>
                <p className="truncate text-xs text-muted-foreground">{m.email}</p>
              </div>
              <Badge variant="secondary">{ROLE_LABEL[m.role]}</Badge>
              {m.role !== "SITE_OWNER" && m.userId !== currentUserId && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    send("DELETE", `/api/v1/sites/${siteId}/members`, {
                      userId: m.userId,
                    })
                  }
                >
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Pending invites */}
      {invites.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Pending invites
          </h2>
          <ul className="divide-y rounded-md border">
            {invites.map((i) => (
              <li key={i.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{i.email}</p>
                </div>
                <Badge variant="outline">{ROLE_LABEL[i.role]}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    send("DELETE", `/api/v1/sites/${siteId}/invites`, {
                      inviteId: i.id,
                    })
                  }
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS. If a shadcn component import fails, add it (`pnpm dlx shadcn@latest add badge select`) and re-run.

- [ ] **Step 8: Commit**

```bash
git add lib/validators/member.ts app/api/v1/sites/"[siteId]"/members app/api/v1/sites/"[siteId]"/invites app/dashboard/sites/"[siteId]"/team components/dashboard/team
git commit -m "feat(team): member/invite API + team management UI"
```

---

## Task 11: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Static checks**

Run:
```bash
pnpm typecheck && pnpm lint && pnpm format:check
```
Expected: typecheck + lint pass (the generated `embed.js` lint warnings are pre-existing and acceptable). If `format:check` flags files, run `pnpm format`.

- [ ] **Step 2: Confirm no stale references**

Run:
```bash
grep -rn "getSiteByIdForOwner\|getSitesByOwner\|getSiteCountByOwner\|getOwnerOverview\|\.role\b" app lib | grep -v "siteMember\|platformRole\|membership.role\|\.role ===\|CommentStatus"
```
Expected: no references to the removed function names or the old `User.role` field.

- [ ] **Step 3: Manual capability matrix** (run `pnpm dev`)

Verify each row of the matrix. Use a second Google account as the invitee.
- [ ] First user on a fresh DB is `PLATFORM_OWNER` (sees Settings + System group); a second registrant is `PLATFORM_USER` (no Settings/System; `/dashboard/administration` redirects to `/dashboard`).
- [ ] Owner invites an email **without** an account → row appears under "Pending invites".
- [ ] That email signs in with Google → invite auto-claimed; appears under "Members"; pending row gone.
- [ ] As `SITE_MODERATOR`: Comments/Users tabs visible and moderation works; Team/Install/Settings tabs hidden; hitting `/dashboard/sites/<id>/settings` → `notFound`.
- [ ] As `SITE_ADMIN`: can edit settings + invite/remove a `SITE_MODERATOR`; the invite role dropdown offers Moderator only (no Admin); cannot delete or transfer the site.
- [ ] As `SITE_OWNER`: can invite Admins + Moderators, delete, and transfer. After transfer, the new owner has `SITE_OWNER`, the old owner is `SITE_ADMIN`, and `Site.ownerId` matches the new owner's `SiteMember`.
- [ ] Cross-site isolation: a moderator of Site A cannot moderate Site B's comments via the API (expect 403/404).

- [ ] **Step 4: Final commit (if formatting changed anything)**

```bash
git add -A
git commit -m "chore: rbac verification formatting" || echo "nothing to commit"
```

---

## Self-Review Notes

- **Spec coverage:** §3 matrix → Task 1 (`SITE_PERMISSIONS`). §4 SSOT → Task 1. §5 schema → Task 2. §6 authz layer → Tasks 3–4, 8. §7 bootstrap/session → Task 5. §8 route/nav gating → Tasks 5 (edge), 6 (sidebar), 9 (site pages). §9 invite flow → Tasks 3, 5, 10. §10 team UI → Task 10. §11 migration → Task 2. §12 verification → Task 11.
- **Pre-existing gap fixed:** comment-moderation routes now resolve site + require `MODERATE` (Task 8 Step 2) — required for cross-site isolation.
- **Type consistency:** Prisma's generated `SiteRole`/`PlatformRole` are string-literal unions identical to `lib/permissions.ts`, so `membership.role` flows into `siteCan` without casts. `GrantableSiteRole` is the shared admin/moderator subset used by validators, service, and UI.
- **Layered rule:** route handlers never import `lib/db.ts`; bulk-comment site resolution goes through `getSiteIdsForComments` in `moderation-service.ts` (Task 8 Step 2).
