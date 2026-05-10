# Comment Edit Feature Design

**Date:** 2025-05-10
**Scope:** Add comment editing capability to both the dashboard (admin) and the public widget embed.

---

## 1. Goal

Allow comments to be edited in two contexts:
- **Dashboard:** Site owners/admins can edit any comment from the comments management table.
- **Widget:** Authenticated commenters can edit their own comments inline.

Edited comments display an "edited" indicator to readers.

---

## 2. Database Schema

Add `editedAt` to the `Comment` model. This is separate from `updatedAt` because moderation actions (approve/spam/delete) also update `updatedAt` — we only want to show "edited" when the **body** changed.

```prisma
model Comment {
  id        String        @id @default(cuid())
  body      String
  status    CommentStatus @default(PENDING)
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
  editedAt  DateTime?     // null = never edited

  pageId String
  page   Page   @relation(fields: [pageId], references: [id], onDelete: Cascade)

  parentId String?
  parent   Comment?  @relation("Replies", fields: [parentId], references: [id])
  replies  Comment[] @relation("Replies")

  commenterId String
  commenter   Commenter @relation(fields: [commenterId], references: [id], onDelete: Cascade)

  likes CommentLike[]
  moderationLogs ModerationLog[]

  @@index([pageId, status, createdAt])
  @@index([parentId])
  @@index([commenterId])
  @@index([status, createdAt])
}
```

---

## 3. API Endpoints

### 3.1 Dashboard — PATCH `/api/v1/comments/[id]`

Extend existing PATCH to accept either `{ status }` or `{ body }` or both.

**Auth:** NextAuth session (any authenticated user)
**Permissions:** Any authenticated admin can edit any comment.
**Behavior:**
- If `body` provided: sanitize via `sanitizeBody()`, update `body`, set `editedAt = now()`.
- If `status` provided: update status (existing behavior).
- Log moderation action `"EDITED"` when body is changed.

### 3.2 Widget — PATCH `/api/widget/comments/[id]`

New endpoint. CORS-enabled.

**Auth:** Widget JWT (`Bearer` token)
**Permissions:** Only the original author (`payload.commenterId === comment.commenterId`).
**Payload:** `{ body: string }`
**Behavior:**
- Sanitize body.
- Update `body` and `editedAt`.
- Return full `CommentData` shape (for immediate local state update).

---

## 4. Service Layer

Add `updateCommentBody` to `lib/services/comment-service.ts`:

```ts
export async function updateCommentBody(
  commentId: string,
  body: string,
): Promise<CommentData> {
  const sanitized = sanitizeBody(body);
  if (!sanitized) throw new ApiError("Comment body is empty", 400);

  const raw = await db.comment.update({
    where: { id: commentId },
    data: { body: sanitized, editedAt: new Date() },
    select: buildCommentSelect(),
  });

  return {
    id: raw.id,
    body: raw.body,
    status: raw.status,
    createdAt: raw.createdAt.toISOString(),
    editedAt: raw.editedAt?.toISOString() ?? null,
    likeCount: raw._count.likes,
    hasLiked: false,
    parentId: raw.parentId,
    commenter: raw.commenter,
    replies: [],
  };
}
```

---

## 5. Dashboard UI

### 5.1 Comments Table (`components/dashboard/comments-table.tsx`)

- Add "Edit" option to the row dropdown menu for every comment.
- Clicking opens a dialog with a textarea pre-filled with the comment body.
- Save button: PATCH `/api/v1/comments/[id]` with `{ body }`, toast success, call `onStatusChange()` to refresh.
- Cancel button: closes dialog.

### 5.2 "Edited" Indicator

In the "View full" dialog and the edit dialog, show "edited" text if `editedAt` is set.

---

## 6. Widget UI

### 6.1 State

Add `isEditingId: string | null` to `ZeonWidget` class.

### 6.2 Inline Edit Form

- In `renderCommentItem`, add an "Edit" button to the actions row, but **only if** `currentUser?.id === comment.commenter.id`.
- When Edit clicked: `isEditingId = comment.id` → re-render.
- The comment body is replaced with an inline textarea + Save/Cancel buttons (style matching the inline reply form).
- On save: `PATCH` to `/api/widget/comments/[id]`, update local comment state, clear `isEditingId`.
- On cancel: clear `isEditingId`.

### 6.3 "Edited" Indicator

Show "edited" text next to the timestamp for comments where `editedAt` is set.

---

## 7. Security Model

| Context | Who can edit | Endpoint | Auth |
|---------|-------------|----------|------|
| Dashboard | Any authenticated admin | `PATCH /api/v1/comments/[id]` | NextAuth session |
| Widget | Only original author | `PATCH /api/widget/comments/[id]` | Widget JWT |
| Both | Body sanitized via `sanitizeBody()` | — | — |

---

## 8. Files to Modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `editedAt` to `Comment` |
| `lib/validators/comment.ts` | Add `UpdateCommentBodySchema` |
| `lib/services/comment-service.ts` | Add `updateCommentBody()` |
| `lib/services/moderation-service.ts` | Extend `moderateComment` to support body edits + log |
| `app/api/v1/comments/[id]/route.ts` | Extend PATCH to handle body + status |
| `app/api/widget/comments/[id]/route.ts` | New PATCH endpoint for widget edits |
| `components/dashboard/comments-table.tsx` | Add Edit dialog + "edited" indicator |
| `widget/src/types.ts` | Add `editedAt` to `CommentData` |
| `widget/src/api.ts` | Add `updateComment()` function |
| `widget/src/render.ts` | Add inline edit form + Edit button + "edited" indicator |
| `widget/src/index.ts` | Add edit state handlers |

---

## 9. Open Questions

None — design approved by user.
