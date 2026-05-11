# Comment Delete Feature Design

**Date:** 2026-05-10
**Scope:** Add comment deletion capability to both the widget embed and the dashboard, with soft-delete semantics that preserve reply chains.

---

## 1. Goal

Allow comments to be deleted in two contexts:
- **Widget:** Authenticated commenters can delete their own comments via a three-dot menu.
- **Dashboard:** Site owners/admins can delete any comment from the comments management table.

Deleted comments remain visible as "Comment Removed" placeholders, preserving all nested and parallel replies.

---

## 2. Database Schema

**No schema changes required.** The `CommentStatus` enum already includes `DELETED`:

```prisma
enum CommentStatus {
  PENDING
  APPROVED
  SPAM
  DELETED
}
```

Soft-delete is achieved by setting `status = DELETED`. The comment record remains in the database with its `parentId` intact, ensuring reply chains are preserved.

---

## 3. API Endpoints

### 3.1 Widget — PATCH `/api/widget/comments/[id]`

**Extend** the existing PATCH endpoint to accept `{ status }` in addition to `{ body }`.

**New unified validator:**
```ts
export const UpdateCommentSchema = z.object({
  body: z.string().min(1).max(5000).optional(),
  status: z.nativeEnum(CommentStatus).optional(),
}).refine((data) => data.body !== undefined || data.status !== undefined, {
  message: "Either body or status is required",
});
```

**Auth:** Widget JWT (`Bearer` token)
**Permissions:** Only the original author (`payload.commenterId === comment.commenterId`).

**Behavior:**
- If `body` provided → sanitize, update `body`, set `editedAt` (existing behavior).
- If `status` provided → update `status` to the given value (e.g., `DELETED`).
- If both provided → reject with 422 (mutually exclusive).
- Return full `CommentData` shape.

### 3.2 Dashboard — PATCH `/api/v1/comments/[id]`

Already supports `{ status }`. Ensure `DELETED` is accepted as a valid status value in the existing validator.

**Auth:** NextAuth session
**Permissions:** Any authenticated admin can delete any comment.

**Behavior:**
- Update `status` to `DELETED`.
- Log moderation action `"DELETED"` via moderation service.

---

## 4. Service Layer

### 4.1 `lib/services/comment-service.ts`

Add a `deleteComment` helper:

```ts
export async function deleteComment(commentId: string) {
  const raw = await db.comment.update({
    where: { id: commentId },
    data: { status: "DELETED" },
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

### 4.2 Query Changes

**Widget GET `/api/widget/comments`** and `getApprovedCommentsForPage`:
- Currently filters by `status: "APPROVED"`.
- **Change:** Use `status: { in: ["APPROVED", "DELETED"] }` so deleted comments are returned and rendered as placeholders.
- Deleted comments should still appear in the list (to preserve reply chains) but rendered differently.

**Dashboard GET `/api/v1/comments`**:
- Already returns all statuses. No change needed.

---

## 5. Widget UI

### 5.1 Three-Dot Menu

Replace the standalone **Edit** button in comment actions with a **three-dot menu** (kebab icon) that appears **only for comments the current user owns**.

**Menu items:**
1. **Edit** — triggers inline edit mode (existing behavior, moved here)
2. **Delete** — triggers delete confirmation flow

**Menu styling:**
- Small dropdown, absolutely positioned below the three-dot button
- Background: `var(--z-bg)`
- Border: `1px solid var(--z-border)`
- Border-radius: `var(--z-radius-sm)`
- Shadow: subtle drop shadow
- Item padding: `6px 12px`
- Item hover: `background: var(--z-accent)`
- Delete item text color: `#ef4444` (red)

**Three-dot button:**
- Icon: vertical ellipsis (⋯)
- Size: same as action buttons (`z-action-btn`)
- Color: `var(--z-muted)`
- Hover: `background: var(--z-accent)`

### 5.2 Delete Confirmation Dialog

When **Delete** is clicked, a small inline confirmation appears **in place of the comment body and actions**:

```
┌─────────────────────────────────────┐
│ [Avatar] Sofia Martinez @sofia      │
│                                      │
│  [Delete this comment? This action  │
│   cannot be undone.]                │
│  [Cancel]  [Delete]                 │
└─────────────────────────────────────┘
```

- Container: same width as comment, padding `10px 12px`
- Background: `color-mix(in srgb, #ef4444 5%, var(--z-bg))`
- Border: `1px solid color-mix(in srgb, #ef4444 20%, transparent)`
- Message: "Delete this comment? This action cannot be undone."
- Buttons: **Cancel** (ghost) | **Delete** (red background, white text)

**On Cancel:** close confirmation, restore normal comment view.
**On Confirm:**
1. PATCH to `/api/widget/comments/[id]` with `{ status: "DELETED" }`
2. On success: transform comment to "Comment Removed" state
3. On error: show error banner

### 5.3 "Comment Removed" State

When a comment has `status === "DELETED"`, it renders as a placeholder:

```
┌─────────────────────────────────────┐
│ [Generic Avatar]  Comment Removed    │
│                  in italics, muted   │
│                                      │
│   └── [replies remain fully visible] │
│       [Avatar 24px] Daniel @danok    │
│       "Agreed!"                      │
└─────────────────────────────────────┘
```

**Visual details:**
- **Avatar:** Generic placeholder icon (neutral silhouette or circle with dash)
  - Same size as regular avatar (30px top-level, 24px reply)
  - Background: `var(--z-subtle)`
  - Color: `var(--z-muted)`
  - Icon: a simple user-slash or circle-minus SVG
- **Author name:** Hidden
- **Body text:** "Comment Removed" in `var(--z-muted)`, `font-style: italic`, `font-size: 13px`
- **Actions row:** Completely hidden (no like, reply, edit, delete, timestamp)
- **Replies:** Preserved and fully visible below the deleted comment
- **Reply indent:** Unchanged

### 5.4 Widget State

Add to `ZeonWidget` class:
```ts
private deletingId: string | null = null;  // which comment has active delete confirmation
```

**Flow:**
1. Three-dot menu → click Delete → `deletingId = comment.id` → re-render
2. `renderCommentItem` checks `deletingId`, replaces body/actions with confirmation UI
3. Confirm → call `handleDeleteComment(commentId)` → PATCH → update local state
4. Cancel → `deletingId = null` → re-render

---

## 6. Dashboard UI

### 6.1 Comments Table

Add **Delete** option to the existing row dropdown menu (currently has Edit).

**Row actions menu:**
- View full
- Edit
- **Delete** (new, in red text)

**Delete confirmation dialog:**
- Title: "Delete Comment"
- Message: "This comment will be marked as deleted. Replies will remain visible."
- Buttons: **Cancel** | **Delete** (destructive/red)
- On confirm: PATCH `/api/v1/comments/[id]` with `{ status: "DELETED" }`
- On success: toast "Comment deleted", refresh table

### 6.2 Deleted Comment in Table

- **Body column:** "Comment Removed" in italics + `var(--z-muted)` color
- **Status badge:** New "Deleted" variant (red/muted)
- **Replies column:** Still shows the count (replies are preserved)
- **Actions:** Still available (admin can still view full, edit status, etc.)

---

## 7. Security Model

| Context | Who can delete | Endpoint | Auth |
|---------|---------------|----------|------|
| Widget | Original author only | `PATCH /api/widget/comments/[id]` | Widget JWT |
| Dashboard | Any authenticated admin | `PATCH /api/v1/comments/[id]` | NextAuth session |

**Ownership enforcement:**
- Widget: verify `payload.commenterId === comment.commenterId`
- Dashboard: any authenticated user (existing behavior for status changes)

---

## 8. Files to Modify

| File | Change |
|------|--------|
| `lib/validators/comment.ts` | Replace `UpdateCommentBodySchema` with unified `UpdateCommentSchema` supporting `body` or `status` |
| `lib/services/comment-service.ts` | Add `deleteComment()`; update `getApprovedCommentsForPage` to include `DELETED` status |
| `app/api/widget/comments/[id]/route.ts` | Extend PATCH to handle `{ status }` with ownership check |
| `app/api/v1/comments/[id]/route.ts` | Ensure PATCH accepts `DELETED` status; log moderation action |
| `widget/src/types.ts` | Add `DELETED` to `CommentData.status` type |
| `widget/src/api.ts` | Add `deleteComment()` function |
| `widget/src/render.ts` | Add three-dot menu, delete confirmation, "Comment Removed" state |
| `widget/src/index.ts` | Add `deletingId` state, delete handlers |
| `widget/src/styles.css` | Add styles for three-dot menu, delete confirmation, deleted comment state |
| `components/dashboard/comments-table.tsx` | Add Delete option to row menu, confirmation dialog |

---

## 9. Open Questions

None — all sections approved by user.
