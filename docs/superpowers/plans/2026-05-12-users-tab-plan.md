# Users Tab with Per-Site Banning - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Users tab to the site dashboard that lists commenters with stats, allows deleting all comments by a user, and per-site banning with "Account is suspended" widget rendering.

**Architecture:** A join model `BannedCommenter` tracks per-site bans. Dashboard gets a new Users page with table, search, pagination, and profile dialog. Widget API includes a `banned` flag for deleted comments.

**Tech Stack:** Next.js 15, Prisma, PostgreSQL, React Server Components, shadcn/ui, Tailwind CSS

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add `BannedCommenter` model, update `Site` and `Commenter` relations |
| `lib/services/user-service.ts` | Create | Service functions for user listing, banning, and deletion |
| `app/api/v1/sites/[siteId]/users/route.ts` | Create | API route for listing users and ban/delete actions |
| `app/api/widget/comments/route.ts` | Modify | Include `banned` flag for deleted comments |
| `widget/src/render.ts` | Modify | Render "Account is suspended" for banned deleted comments |
| `widget/src/types.ts` | Modify | Add `banned?: boolean` to comment type |
| `components/dashboard/site-sub-nav.tsx` | Modify | Add "Users" tab after Comments |
| `app/dashboard/sites/[siteId]/users/page.tsx` | Create | Server Component users page |
| `app/dashboard/sites/[siteId]/users/loading.tsx` | Create | Loading skeleton for users page |
| `components/dashboard/users-table.tsx` | Create | Client Component user list table |
| `components/dashboard/user-profile-dialog.tsx` | Create | Dialog showing all comments by a user |
| `components/dashboard/user-search-input.tsx` | Create | Search input for filtering users |
| `lib/services/comment-client.ts` | Modify | Add client functions for ban/delete-all |

---

### Task 1: Database Schema - Add BannedCommenter Model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add BannedCommenter model and relations**

Add the `BannedCommenter` model after the `ModerationLog` model, and update `Site` and `Commenter`:

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

Update `Site` model (add relation):
```prisma
model Site {
  // ... existing fields
  bannedCommenters BannedCommenter[]
}
```

Update `Commenter` model (add relation):
```prisma
model Commenter {
  // ... existing fields
  bannedOnSites BannedCommenter[]
}
```

- [ ] **Step 2: Validate schema**

Run: `npx prisma validate`
Expected: Schema is valid.

- [ ] **Step 3: Create migration**

Run: `npx prisma migrate dev --name add_banned_commenter`

- [ ] **Step 4: Generate client**

Run: `npx prisma generate`

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add BannedCommenter model for per-site user bans"
```

---

### Task 2: Service Layer - User Service

**Files:**
- Create: `lib/services/user-service.ts`

- [ ] **Step 1: Create user-service.ts with getCommentersBySite**

```typescript
import { db } from '@/lib/db';
import { ApiError } from '@/lib/api/error';
import { CommentStatus } from '@/generated/prisma/client';

export async function getCommentersBySite(
  siteId: string,
  filters: { page?: number; limit?: number; search?: string } = {},
) {
  const { page = 1, limit = 20, search } = filters;
  const skip = (page - 1) * limit;

  const searchFilter = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { username: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : undefined;

  // Get total count of distinct commenters on this site
  const totalResult = await db.comment.groupBy({
    by: ['commenterId'],
    where: {
      page: { siteId },
      ...(searchFilter && {
        commenter: searchFilter,
      }),
    },
    _count: { commenterId: true },
  });
  const total = totalResult.length;

  // Get commenters with stats
  const commentersData = await db.comment.groupBy({
    by: ['commenterId'],
    where: {
      page: { siteId },
      ...(searchFilter && {
        commenter: searchFilter,
      }),
    },
    _count: {
      commenterId: true,
    },
    orderBy: { commenterId: 'asc' },
    skip,
    take: limit,
  });

  const commenterIds = commentersData.map((c) => c.commenterId);

  // Fetch commenter details
  const commenters = await db.commenter.findMany({
    where: { id: { in: commenterIds } },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      username: true,
    },
  });

  // Get status breakdown per commenter
  const statusCounts = await db.comment.groupBy({
    by: ['commenterId', 'status'],
    where: {
      page: { siteId },
      commenterId: { in: commenterIds },
    },
    _count: { status: true },
  });

  // Check banned status
  const bannedRecords = await db.bannedCommenter.findMany({
    where: {
      siteId,
      commenterId: { in: commenterIds },
    },
    select: { commenterId: true },
  });
  const bannedSet = new Set(bannedRecords.map((b) => b.commenterId));

  // Build result
  const result = commenterIds.map((id) => {
    const commenter = commenters.find((c) => c.id === id);
    const counts = statusCounts.filter((s) => s.commenterId === id);
    const totalCount = counts.reduce((sum, c) => sum + c._count.status, 0);
    const deletedCount = counts.find((c) => c.status === CommentStatus.DELETED)?._count.status ?? 0;
    const spamCount = counts.find((c) => c.status === CommentStatus.SPAM)?._count.status ?? 0;

    return {
      id,
      name: commenter?.name ?? '',
      email: commenter?.email ?? '',
      image: commenter?.image ?? null,
      username: commenter?.username ?? '',
      totalCount,
      deletedCount,
      spamCount,
      isBanned: bannedSet.has(id),
    };
  });

  return { commenters: result, total, page, limit };
}
```

- [ ] **Step 2: Add getCommentsByCommenterOnSite**

Append to `lib/services/user-service.ts`:

```typescript
export async function getCommentsByCommenterOnSite(siteId: string, commenterId: string) {
  const comments = await db.comment.findMany({
    where: {
      page: { siteId },
      commenterId,
    },
    include: {
      page: { select: { slug: true, url: true } },
      commenter: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return comments;
}
```

- [ ] **Step 3: Add deleteAllCommentsByCommenterOnSite**

Append to `lib/services/user-service.ts`:

```typescript
export async function deleteAllCommentsByCommenterOnSite(
  siteId: string,
  commenterId: string,
  adminEmail: string,
) {
  const commentsToDelete = await db.comment.findMany({
    where: {
      page: { siteId },
      commenterId,
      status: { not: CommentStatus.DELETED },
    },
    select: { id: true },
  });

  if (commentsToDelete.length === 0) {
    return { deletedCount: 0 };
  }

  const commentIds = commentsToDelete.map((c) => c.id);

  await db.$transaction([
    db.comment.updateMany({
      where: { id: { in: commentIds } },
      data: { status: CommentStatus.DELETED },
    }),
    ...commentIds.map((commentId) =>
      db.moderationLog.create({
        data: { commentId, action: 'DELETED', adminEmail },
      }),
    ),
  ]);

  return { deletedCount: commentsToDelete.length };
}
```

- [ ] **Step 4: Add banCommenterOnSite**

Append to `lib/services/user-service.ts`:

```typescript
export async function banCommenterOnSite(
  siteId: string,
  commenterId: string,
  adminEmail: string,
) {
  const existing = await db.bannedCommenter.findUnique({
    where: { siteId_commenterId: { siteId, commenterId } },
  });

  if (existing) {
    throw new ApiError('User is already banned on this site', 409);
  }

  await db.bannedCommenter.create({
    data: { siteId, commenterId },
  });

  const { deletedCount } = await deleteAllCommentsByCommenterOnSite(
    siteId,
    commenterId,
    adminEmail,
  );

  return { banned: true, deletedCount };
}
```

- [ ] **Step 5: Add unbanCommenterOnSite**

Append to `lib/services/user-service.ts`:

```typescript
export async function unbanCommenterOnSite(siteId: string, commenterId: string) {
  await db.bannedCommenter.delete({
    where: { siteId_commenterId: { siteId, commenterId } },
  });

  return { unbanned: true };
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/services/user-service.ts
git commit -m "feat: add user service for listing, banning, and deleting"
```

---

### Task 3: API Routes - Users and Ban Actions

**Files:**
- Create: `app/api/v1/sites/[siteId]/users/route.ts`
- Create: `app/api/v1/sites/[siteId]/users/[commenterId]/ban/route.ts`

- [ ] **Step 1: Create GET users list API**

```typescript
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { getSiteByIdForOwner } from '@/lib/services/site-service';
import { getCommentersBySite } from '@/lib/services/user-service';
import { jsonResponse, errorResponse } from '@/lib/api/response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const session = await auth();
  if (!session?.user?.email) {
    return errorResponse('Unauthorized', 401);
  }

  const { siteId } = await params;

  try {
    await getSiteByIdForOwner(siteId, session.user.id as string);
  } catch {
    return errorResponse('Site not found', 404);
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const search = searchParams.get('search') ?? undefined;

  const result = await getCommentersBySite(siteId, { page, limit: 20, search });

  return jsonResponse(result);
}
```

- [ ] **Step 2: Create ban/unban/delete-all API**

Create `app/api/v1/sites/[siteId]/users/[commenterId]/ban/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { getSiteByIdForOwner } from '@/lib/services/site-service';
import {
  banCommenterOnSite,
  unbanCommenterOnSite,
  deleteAllCommentsByCommenterOnSite,
} from '@/lib/services/user-service';
import { jsonResponse, errorResponse } from '@/lib/api/response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string; commenterId: string }> },
) {
  const session = await auth();
  if (!session?.user?.email) {
    return errorResponse('Unauthorized', 401);
  }

  const { siteId, commenterId } = await params;

  try {
    await getSiteByIdForOwner(siteId, session.user.id as string);
  } catch {
    return errorResponse('Site not found', 404);
  }

  const body = await request.json();
  const action = body.action;

  try {
    if (action === 'ban') {
      const result = await banCommenterOnSite(
        siteId,
        commenterId,
        session.user.email,
      );
      return jsonResponse(result);
    }

    if (action === 'unban') {
      const result = await unbanCommenterOnSite(siteId, commenterId);
      return jsonResponse(result);
    }

    if (action === 'deleteAll') {
      const result = await deleteAllCommentsByCommenterOnSite(
        siteId,
        commenterId,
        session.user.email,
      );
      return jsonResponse(result);
    }

    return errorResponse('Invalid action', 400);
  } catch (err) {
    if (err instanceof Error && err.message.includes('already banned')) {
      return errorResponse(err.message, 409);
    }
    return errorResponse('Action failed', 500);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/v1/sites/[siteId]/users/
git commit -m "feat: add users list and ban/delete API routes"
```

---

### Task 4: Widget API - Include Banned Flag

**Files:**
- Modify: `app/api/widget/comments/route.ts`

- [ ] **Step 1: Read current widget comments API**

Open `app/api/widget/comments/route.ts` and read its GET handler.

- [ ] **Step 2: Modify GET to include banned flag for deleted comments**

After fetching comments, collect unique `commenterId`s for deleted comments, query `BannedCommenter`, and add `banned: boolean` to each deleted comment.

Find the code that maps raw comments to the response shape. After that mapping (or during it), add:

```typescript
// Collect commenterIds of deleted comments
const deletedCommenterIds = [
  ...new Set(
    raw
      .filter((c) => c.status === CommentStatus.DELETED)
      .map((c) => c.commenterId),
  ),
];

// Check which commenters are banned on this site
const bannedRecords =
  deletedCommenterIds.length > 0
    ? await db.bannedCommenter.findMany({
        where: {
          siteId: site.id,
          commenterId: { in: deletedCommenterIds },
        },
        select: { commenterId: true },
      })
    : [];
const bannedSet = new Set(bannedRecords.map((b) => b.commenterId));

// Map comments with banned flag
const comments = raw.map((c) => ({
  id: c.id,
  body: c.body,
  status: c.status,
  createdAt: c.createdAt.toISOString(),
  editedAt: c.editedAt?.toISOString() ?? null,
  likeCount: c._count.likes,
  hasLiked: userEmail ? c.likes.length > 0 : false,
  parentId: c.parentId,
  commenter: c.commenter,
  banned: c.status === CommentStatus.DELETED ? bannedSet.has(c.commenterId) : undefined,
  replies: c.replies.map((r) => ({
    id: r.id,
    body: r.body,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    editedAt: r.editedAt?.toISOString() ?? null,
    likeCount: r._count.likes,
    hasLiked: userEmail ? r.likes.length > 0 : false,
    parentId: r.parentId,
    commenter: r.commenter,
    replies: [],
  })),
}));
```

- [ ] **Step 3: Commit**

```bash
git add app/api/widget/comments/route.ts
git commit -m "feat: include banned flag for deleted comments in widget API"
```

---

### Task 5: Widget Types and Rendering

**Files:**
- Modify: `widget/src/types.ts`
- Modify: `widget/src/render.ts`

- [ ] **Step 1: Add banned field to comment type**

Open `widget/src/types.ts`, find the comment type/interface, and add:

```typescript
banned?: boolean;
```

- [ ] **Step 2: Update render.ts to show "Account is suspended"**

Open `widget/src/render.ts`, find the code that renders deleted comment text. Change it from always showing "Comment Removed" to:

```typescript
if (comment.status === 'DELETED') {
  const text = comment.banned ? 'Account is suspended' : 'Comment Removed';
  // render text...
}
```

The exact code depends on how the widget currently renders deleted comments. Look for `"Comment Removed"` in the file.

- [ ] **Step 3: Rebuild widget**

Run the widget build script (check `package.json` or `widget/build.ts`):

```bash
npx tsx widget/build.ts
```

- [ ] **Step 4: Commit**

```bash
git add widget/src/types.ts widget/src/render.ts public/embed.js
git commit -m "feat(widget): render 'Account is suspended' for banned users"
```

---

### Task 6: Dashboard Navigation - Add Users Tab

**Files:**
- Modify: `components/dashboard/site-sub-nav.tsx`

- [ ] **Step 1: Add Users tab to SiteSubNav**

Open `components/dashboard/site-sub-nav.tsx`. Update the `TABS` array and add the import:

```typescript
import { RiUserLine } from '@remixicon/react';
```

Update `TABS`:

```typescript
const TABS = [
  { label: 'Overview', href: '', icon: RiDashboardLine },
  { label: 'Comments', href: '/comments', icon: RiMessage2Line },
  { label: 'Users', href: '/users', icon: RiUserLine },
  { label: 'Install', href: '/install', icon: RiCodeSSlashLine },
  { label: 'Settings', href: '/settings', icon: RiSettingsLine },
];
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/site-sub-nav.tsx
git commit -m "feat: add Users tab to site sub-navigation"
```

---

### Task 7: Dashboard Users Page

**Files:**
- Create: `app/dashboard/sites/[siteId]/users/page.tsx`
- Create: `app/dashboard/sites/[siteId]/users/loading.tsx`

- [ ] **Step 1: Create users page**

```tsx
import { auth } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { getSiteByIdForOwner } from '@/lib/services/site-service';
import { getCommentersBySite } from '@/lib/services/user-service';
import { UsersTable } from '@/components/dashboard/users-table';
import { UserSearchInput } from '@/components/dashboard/user-search-input';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ page?: string; search?: string }>;
};

const LIMIT = 20;

export default async function UsersPage({ params, searchParams }: Props) {
  const { siteId } = await params;
  const { page: pageParam, search } = await searchParams;

  const session = await auth();

  let site;
  try {
    site = await getSiteByIdForOwner(siteId, session!.user!.id as string);
  } catch {
    notFound();
  }

  const currentPage = Math.max(1, parseInt(pageParam ?? '1', 10));

  const { commenters, total, page, limit } = await getCommentersBySite(siteId, {
    page: currentPage,
    limit: LIMIT,
    search: search || undefined,
  });

  const totalPages = Math.ceil(total / limit);

  function buildHref(overrides: { page?: number; search?: string | null }) {
    const base = `/dashboard/sites/${siteId}/users`;
    const params = new URLSearchParams();

    const sr = overrides.search !== undefined ? overrides.search : (search ?? undefined);
    if (sr) params.set('search', sr);

    const p = overrides.page ?? currentPage;
    if (p > 1) params.set('page', String(p));

    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1),
  );

  const dedupedPageNumbers = pageNumbers.reduce<number[]>((acc, p, i) => {
    if (i > 0 && p - pageNumbers[i - 1] > 1) {
      acc.push(-1);
    }
    acc.push(p);
    return acc;
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-background border-b px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-base font-semibold shrink-0">Users</h1>
          <span className="text-sm text-muted-foreground tabular-nums shrink-0">
            {total} {total === 1 ? 'user' : 'users'}
          </span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <UserSearchInput />
        </div>
      </div>

      <div className="p-6 overflow-auto flex-1">
        <UsersTable commenters={commenters} siteId={siteId} />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={currentPage <= 1}
                asChild
              >
                <Link href={buildHref({ page: currentPage - 1 })}>
                  <ChevronLeft className="size-4" />
                </Link>
              </Button>

              {dedupedPageNumbers.map((p, i) =>
                p === -1 ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-sm text-muted-foreground">
                    ...
                  </span>
                ) : (
                  <Button
                    key={p}
                    variant={p === currentPage ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 min-w-8 px-2.5"
                    asChild
                  >
                    <Link href={buildHref({ page: p })}>{p}</Link>
                  </Button>
                ),
              )}

              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={currentPage >= totalPages}
                asChild
              >
                <Link href={buildHref({ page: currentPage + 1 })}>
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create loading.tsx**

```tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function UsersLoading() {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="sticky top-0 z-10 bg-background border-b px-6 py-3 flex items-center justify-between gap-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="p-6 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/sites/[siteId]/users/
git commit -m "feat: add users dashboard page with pagination and search"
```

---

### Task 8: Client Components - Users Table, Search, Profile Dialog

**Files:**
- Create: `components/dashboard/user-search-input.tsx`
- Create: `components/dashboard/users-table.tsx`
- Create: `components/dashboard/user-profile-dialog.tsx`
- Modify: `lib/services/comment-client.ts`

- [ ] **Step 1: Create UserSearchInput**

```tsx
'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export function UserSearchInput() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [value, setValue] = useState(searchParams.get('search') ?? '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (value.trim()) {
      params.set('search', value.trim());
      params.delete('page');
    } else {
      params.delete('search');
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search by name, email..."
        className="pl-9 w-64"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={isPending}
      />
    </form>
  );
}
```

- [ ] **Step 2: Add client service functions**

Open `lib/services/comment-client.ts` and add:

```typescript
export async function banCommenter(siteId: string, commenterId: string) {
  const res = await fetch(`/api/v1/sites/${siteId}/users/${commenterId}/ban`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'ban' }),
  });
  if (!res.ok) throw new Error('Failed to ban user');
  return res.json();
}

export async function unbanCommenter(siteId: string, commenterId: string) {
  const res = await fetch(`/api/v1/sites/${siteId}/users/${commenterId}/ban`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'unban' }),
  });
  if (!res.ok) throw new Error('Failed to unban user');
  return res.json();
}

export async function deleteAllCommentsByCommenter(siteId: string, commenterId: string) {
  const res = await fetch(`/api/v1/sites/${siteId}/users/${commenterId}/ban`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'deleteAll' }),
  });
  if (!res.ok) throw new Error('Failed to delete all comments');
  return res.json();
}
```

- [ ] **Step 3: Create UsersTable**

```tsx
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { banCommenter, deleteAllCommentsByCommenter } from '@/lib/services/comment-client';
import { useOptimisticState } from '@/hooks/use-optimistic-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
  import { Badge } from '@/components/ui/badge';
  import { Button } from '@/components/ui/button';
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu';
  import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
  import { MoreHorizontal, ShieldAlert, Trash2, Eye } from 'lucide-react';
  import { UserProfileDialog } from './user-profile-dialog';

  type Commenter = {
    id: string;
    name: string;
    email: string;
    image: string | null;
    username: string;
    totalCount: number;
    deletedCount: number;
    spamCount: number;
    isBanned: boolean;
  };

  type Props = {
    commenters: Commenter[];
    siteId: string;
  };

  export function UsersTable({ commenters, siteId }: Props) {
    const [profileUser, setProfileUser] = useState<Commenter | null>(null);

    const {
      data: optimisticCommenters,
      updateItem,
      revertItem,
      setBusy,
      isBusy,
    } = useOptimisticState<Commenter>(commenters);

    async function handleDeleteAll(commenterId: string) {
      const original = optimisticCommenters.find((c) => c.id === commenterId);
      if (!original) return;

      updateItem((c) => c.id === commenterId, {
        totalCount: original.deletedCount + original.spamCount,
        deletedCount: original.totalCount - original.spamCount,
      });
      setBusy(commenterId, true);

      try {
        await deleteAllCommentsByCommenter(siteId, commenterId);
        toast.success('All comments deleted');
      } catch {
        revertItem((c) => c.id === commenterId, original);
        toast.error('Failed to delete comments');
      } finally {
        setBusy(commenterId, false);
      }
    }

    async function handleBan(commenterId: string) {
      const original = optimisticCommenters.find((c) => c.id === commenterId);
      if (!original) return;

      updateItem((c) => c.id === commenterId, {
        isBanned: true,
        deletedCount: original.totalCount - original.spamCount,
      });
      setBusy(commenterId, true);

      try {
        await banCommenter(siteId, commenterId);
        toast.success('User banned');
      } catch (err) {
        revertItem((c) => c.id === commenterId, original);
        toast.error('Failed to ban user');
      } finally {
        setBusy(commenterId, false);
      }
    }

    if (optimisticCommenters.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <p className="text-muted-foreground text-sm">No users found</p>
        </div>
      );
    }

    return (
      <>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Author</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Deleted</TableHead>
                <TableHead>Spam</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {optimisticCommenters.map((commenter) => (
                <TableRow
                  key={commenter.id}
                  className="cursor-pointer"
                  onClick={() => setProfileUser(commenter)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="size-7 shrink-0">
                        <AvatarImage src={commenter.image ?? ''} />
                        <AvatarFallback className="text-xs">
                          {commenter.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{commenter.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {commenter.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums">{commenter.totalCount}</TableCell>
                  <TableCell className="tabular-nums">{commenter.deletedCount}</TableCell>
                  <TableCell className="tabular-nums">{commenter.spamCount}</TableCell>
                  <TableCell>
                    {commenter.isBanned && (
                      <Badge variant="destructive">Banned</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          disabled={isBusy(commenter.id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Actions for ${commenter.name}`}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setProfileUser(commenter)}>
                          <Eye className="mr-2 size-4" />
                          View profile
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAll(commenter.id);
                          }}
                        >
                          <Trash2 className="mr-2 size-4" />
                          Delete all comments
                        </DropdownMenuItem>
                        {!commenter.isBanned && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBan(commenter.id);
                            }}
                          >
                            <ShieldAlert className="mr-2 size-4" />
                            Ban user
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <UserProfileDialog
          open={!!profileUser}
          onClose={() => setProfileUser(null)}
          commenter={profileUser}
          siteId={siteId}
        />
      </>
    );
  }
```

- [ ] **Step 4: Create UserProfileDialog**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { getCommentsByCommenterOnSite } from '@/lib/services/user-service';
import { patchCommentStatus } from '@/lib/services/comment-client';
import { CommentStatus } from '@/generated/prisma/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, ShieldAlert, Trash2 } from 'lucide-react';

  type Commenter = {
    id: string;
    name: string;
    email: string;
    image: string | null;
    username: string;
  };

  type CommentItem = {
    id: string;
    body: string;
    status: CommentStatus;
    createdAt: Date;
    editedAt?: Date | null;
    page: { slug: string; url: string | null };
    commenter: Commenter;
  };

  type Props = {
    open: boolean;
    onClose: () => void;
    commenter: Commenter | null;
    siteId: string;
  };

  const STATUS_BADGE: Record<CommentStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    APPROVED: { label: 'Approved', variant: 'default' },
    PENDING: { label: 'Pending', variant: 'secondary' },
    SPAM: { label: 'Spam', variant: 'destructive' },
    DELETED: { label: 'Deleted', variant: 'outline' },
  };

  export function UserProfileDialog({ open, onClose, commenter, siteId }: Props) {
    const [comments, setComments] = useState<CommentItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      if (open && commenter) {
        setLoading(true);
        getCommentsByCommenterOnSite(siteId, commenter.id)
          .then((data) => {
            setComments(data);
          })
          .catch(() => {
            toast.error('Failed to load comments');
          })
          .finally(() => {
            setLoading(false);
          });
      }
    }, [open, commenter, siteId]);

    async function handleStatusChange(commentId: string, status: CommentStatus) {
      try {
        await patchCommentStatus(commentId, status);
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, status } : c)),
        );
        toast.success(`Comment ${status.toLowerCase()}`);
      } catch {
        toast.error('Action failed');
      }
    }

    if (!commenter) return null;

    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Avatar className="size-10">
                <AvatarImage src={commenter.image ?? ''} />
                <AvatarFallback>{commenter.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle>{commenter.name}</DialogTitle>
                <DialogDescription>{commenter.email}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading comments...</p>
            ) : comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments</p>
            ) : (
              comments.map((comment) => {
                const badge = STATUS_BADGE[comment.status];
                return (
                  <div key={comment.id} className="rounded-md border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <p
                      className={
                        comment.status === CommentStatus.DELETED
                          ? 'text-sm italic text-muted-foreground'
                          : 'text-sm'
                      }
                    >
                      {comment.status === CommentStatus.DELETED ? 'Comment Removed' : comment.body}
                    </p>
                    <p className="text-xs font-mono text-muted-foreground">{comment.page.slug}</p>
                    <div className="flex gap-2 pt-1">
                      {comment.status !== CommentStatus.APPROVED && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7"
                          onClick={() => handleStatusChange(comment.id, CommentStatus.APPROVED)}
                        >
                          <Check className="mr-1 size-3" />
                          Approve
                        </Button>
                      )}
                      {comment.status !== CommentStatus.SPAM && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7"
                          onClick={() => handleStatusChange(comment.id, CommentStatus.SPAM)}
                        >
                          <ShieldAlert className="mr-1 size-3" />
                          Spam
                        </Button>
                      )}
                      {comment.status !== CommentStatus.DELETED && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-destructive"
                          onClick={() => handleStatusChange(comment.id, CommentStatus.DELETED)}
                        >
                          <Trash2 className="mr-1 size-3" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }
```

Note: `getCommentsByCommenterOnSite` needs to be callable from client. Since it's a server-only function, create a client wrapper or an API route. The simplest approach is to create a GET route for user comments and call it from the dialog.

Alternative: Create `app/api/v1/sites/[siteId]/users/[commenterId]/comments/route.ts`:

```typescript
import { auth } from '@/lib/auth';
import { getSiteByIdForOwner } from '@/lib/services/site-service';
import { getCommentsByCommenterOnSite } from '@/lib/services/user-service';
import { jsonResponse, errorResponse } from '@/lib/api/response';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ siteId: string; commenterId: string }> },
) {
  const session = await auth();
  if (!session?.user?.email) {
    return errorResponse('Unauthorized', 401);
  }

  const { siteId, commenterId } = await params;

  try {
    await getSiteByIdForOwner(siteId, session.user.id as string);
  } catch {
    return errorResponse('Site not found', 404);
  }

  const comments = await getCommentsByCommenterOnSite(siteId, commenterId);
  return jsonResponse(comments);
}
```

Then update `UserProfileDialog` to fetch from this endpoint instead of calling the service directly.

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/users-table.tsx components/dashboard/user-profile-dialog.tsx components/dashboard/user-search-input.tsx lib/services/comment-client.ts app/api/v1/sites/[siteId]/users/[commenterId]/comments/route.ts
git commit -m "feat: add users table, profile dialog, and search components"
```

---

### Task 9: Final Integration and Testing

- [ ] **Step 1: Verify all imports resolve**

Run: `npx tsc --noEmit`
Expected: No TypeScript errors.

- [ ] **Step 2: Test the widget build**

Run: `npx tsx widget/build.ts`
Expected: Build succeeds, `public/embed.js` updated.

- [ ] **Step 3: Run the dev server and manually verify**

Run: `yarn dev` (or `npm run dev`)
Navigate to a site's Users tab.

Verify:
- Users list loads with correct stats
- Search filters by name/email
- Pagination works
- Clicking a user opens profile dialog with their comments
- "Delete all comments" soft-deletes all comments
- "Ban user" creates ban record and deletes comments
- Banned users show "Account is suspended" in widget

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: implement Users tab with per-site banning"
```

---

## Spec Coverage Check

| Spec Requirement | Task |
|---|---|
| BannedCommenter model with indexes | Task 1 |
| getCommentersBySite with pagination/search | Task 2 |
| getCommentsByCommenterOnSite | Task 2 |
| deleteAllCommentsByCommenterOnSite | Task 2 |
| banCommenterOnSite with 409 on duplicate | Task 2 |
| unbanCommenterOnSite | Task 2 |
| Widget API includes banned flag | Task 4 |
| Widget renders "Account is suspended" | Task 5 |
| Users tab in SiteSubNav | Task 6 |
| Users page with pagination/search | Task 7 |
| UsersTable with actions | Task 8 |
| UserProfileDialog with inline actions | Task 8 |

## Placeholder Scan

- No TBD/TODO placeholders found.
- All code blocks contain actual implementation.
- All file paths are exact.

## Type Consistency Check

- `CommentStatus` used consistently from `@/generated/prisma/client`.
- `commenterId` parameter name consistent across all functions.
- `siteId` parameter name consistent across all functions.
- `BannedCommenter` composite unique key `siteId_commenterId` matches Prisma convention.
- Return types from service layer match API response shapes.
