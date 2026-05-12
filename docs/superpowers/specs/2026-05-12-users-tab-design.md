# Users Tab with Per-Site Banning

## Overview

Add a **Users** tab to the site dashboard (immediately after the **Comments** tab) that lists all commenters who have posted on a given site, shows their comment statistics, and allows site administrators to delete all comments by a user or ban them from the site.

Banning a user is **per-site only** and has two effects:
1. All existing comments by that user on the site are soft-deleted.
2. The widget renders "Account is suspended" instead of "Comment Removed" for those deleted comments.

## Requirements

- Display a paginated, searchable list of commenters for a site.
- Show per-commenter stats: total comments, deleted comments, spam comments.
- Search by username, name, or email.
- Clicking a commenter's profile opens a dialog showing all their comments on the site (with delete/spam actions).
- Three-dots menu actions: **Delete All Comments**, **Ban User**.
- Banning inserts a `BannedCommenter` record and soft-deletes all existing comments.
- Widget renders "Account is suspended" for deleted comments whose commenter is banned.

## Architecture

```
Dashboard
├── SiteSubNav (updated with Users tab)
├── /dashboard/sites/[siteId]/users/page.tsx (Server Component)
├── UsersTable (Client Component)
├── UserProfileDialog (Client Component)
└── UserSearchInput (Client Component)

Services
├── lib/services/user-service.ts (new)
│   ├── getCommentersBySite
│   ├── getCommentsByCommenterOnSite
│   ├── deleteAllCommentsByCommenterOnSite
│   ├── banCommenterOnSite
│   └── unbanCommenterOnSite
└── lib/services/moderation-service.ts (update)
    └── getSiteCommentStats (already exists, no change needed)

Widget
├── app/api/widget/comments/route.ts (update)
│   └── Include banned flag for deleted comments
└── widget/src/render.ts (update)
    └── Render "Account is suspended" when banned
```

## Database Schema

### New Model: `BannedCommenter`

```prisma
model BannedCommenter {
  id          String   @id @default(cuid())
  siteId      String
  commenterId String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  site      Site      @relation(fields: [siteId], references: [id], onDelete: Cascade)
  commenter Commenter @relation(fields: [commenterId], references: [id], onDelete: Cascade)

  @@unique([siteId, commenterId])
  @@index([siteId])
  @@index([commenterId])
}
```

### Updated Models

```prisma
model Site {
  // ... existing fields
  bannedCommenters BannedCommenter[]
}

model Commenter {
  // ... existing fields
  bannedOnSites BannedCommenter[]
}
```

## Service Layer

### `getCommentersBySite(siteId: string, filters)`

Returns paginated commenters with aggregated stats for the given site.

**Query strategy:**
1. Find all distinct `commenterId`s from `Comment` where `page.siteId = siteId`.
2. For each commenter, count:
   - `total`: all comments
   - `deleted`: `status = DELETED`
   - `spam`: `status = SPAM`
3. Support `search` filtering on `commenter.name`, `commenter.email`, `commenter.username`.
4. Return `page` and `limit` for pagination.

**Return type:**
```ts
{
  commenters: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    username: string;
    totalCount: number;
    deletedCount: number;
    spamCount: number;
    isBanned: boolean;
  }[];
  total: number;
  page: number;
  limit: number;
}
```

### `getCommentsByCommenterOnSite(siteId, commenterId)`

Returns all comments (including replies) by the commenter on the site in a flat list, ordered by `createdAt desc`. Reuses the same shape as `getCommentsBySite` for consistency.

### `deleteAllCommentsByCommenterOnSite(siteId, commenterId, adminEmail)`

1. Find all comments (including replies) by `commenterId` on pages belonging to `siteId` where `status != DELETED`.
2. Update their status to `DELETED`.
3. Create a `ModerationLog` entry for each affected comment with `action = "DELETED"`.
4. Return the count of affected comments.

### `banCommenterOnSite(siteId, commenterId, adminEmail)`

1. Check if a `BannedCommenter` record already exists for `(siteId, commenterId)`. If yes, throw `409 Conflict`.
2. Create the `BannedCommenter` record.
3. Call `deleteAllCommentsByCommenterOnSite(siteId, commenterId, adminEmail)`.
4. Return `{ banned: true, deletedCount }`.

### `unbanCommenterOnSite(siteId, commenterId)`

1. Delete the `BannedCommenter` record.
2. Comments remain `DELETED` (no automatic restoration).

## Dashboard UI

### Updated Navigation

`SiteSubNav` gains a new tab:

```ts
const TABS = [
  { label: "Overview",  href: "",          icon: RiDashboardLine  },
  { label: "Comments",  href: "/comments", icon: RiMessage2Line   },
  { label: "Users",     href: "/users",    icon: RiUserLine       },  // NEW
  { label: "Install",   href: "/install",  icon: RiCodeSSlashLine },
  { label: "Settings",  href: "/settings", icon: RiSettingsLine   },
];
```

### Users Page (`/dashboard/sites/[siteId]/users`)

- **Server Component** following existing dashboard patterns.
- **Toolbar:** Title "Users", total count, search input, pagination controls.
- **Table columns:** Author (avatar + name + email), Total, Deleted, Spam, Actions.
- **Empty state:** "No users found" message.
- **Pagination:** Same pattern as comments page (20 per page).

### UsersTable Component

Similar to `CommentsTable` but for users.
- **Profile click:** Opens `UserProfileDialog`.
- **Three-dots menu:**
  - View profile (same as click)
  - Delete All Comments
  - Ban User (shown only if not already banned)

### UserProfileDialog

- Shows a scrollable list of all comments by the selected user on the site.
- Each comment row shows: body (truncated), page slug, status badge, date.
- Actions per comment: Delete, Mark as Spam (reuses existing client service functions).
- Close button returns to the Users table.

## Widget Changes

### API (`app/api/widget/comments/route.ts`)

In the GET handler that returns comments for a page, when a comment has `status === "DELETED"`, check if the commenter is banned on the site. Add a `banned: boolean` field to the comment response.

**Implementation approach:**
1. After fetching comments, collect all unique `commenterId`s for deleted comments.
2. Query `BannedCommenter` for `(siteId, commenterId)` pairs.
3. Map the results back into the comment objects.

### Rendering (`widget/src/render.ts`)

When rendering a comment with `status === 'DELETED'`:
- If `comment.banned === true` → render `"Account is suspended"`
- Otherwise → render `"Comment Removed"` (existing behavior)

## Error Handling

| Scenario | Response |
|---|---|
| Ban already exists | `409 Conflict` — "User is already banned on this site" |
| Delete all but no comments | `200 OK` — `{ deletedCount: 0 }` (idempotent) |
| Invalid siteId | `404 Not Found` (handled by existing auth checks) |
| Unauthorized | `403 Forbidden` (handled by existing auth checks) |

All admin mutations create `ModerationLog` entries.

## Testing Plan

1. **Unit tests for service functions:**
   - `getCommentersBySite` with and without search
   - `banCommenterOnSite` creates record and deletes comments
   - `banCommenterOnSite` throws 409 on duplicate
   - `deleteAllCommentsByCommenterOnSite` creates moderation logs

2. **Integration tests:**
   - Widget GET returns `banned: true` for banned commenters
   - Widget renders "Account is suspended" correctly
   - Dashboard users page loads with correct stats

3. **Manual verification:**
   - Ban user → verify all comments deleted
   - Unban user → verify comments remain deleted
   - Search users by email/username
   - Profile dialog shows correct comments

## Migration

```bash
npx prisma migrate dev --name add_banned_commenter
```

SQL should create:
- `BannedCommenter` table
- Composite unique index on `(siteId, commenterId)`
- Indexes on `siteId` and `commenterId`
- Foreign keys with `ON DELETE CASCADE`

## Open Questions

None — all clarifications resolved.
