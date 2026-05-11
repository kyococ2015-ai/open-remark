# Comment Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add comment deletion (soft-delete) to the widget embed and dashboard, preserving reply chains with a "Comment Removed" placeholder state.

**Architecture:** Extend the existing widget PATCH endpoint to accept `{ status: "DELETED" }`. Replace the standalone Edit button with a three-dot menu containing Edit and Delete. Add inline delete confirmation and a "Comment Removed" render state. Update dashboard comments table with a Delete row action.

**Tech Stack:** Next.js, Prisma, TypeScript, vanilla JS widget (shadow DOM), shadcn/ui (dashboard)

---

### Task 1: Update Comment Validator

**Files:**
- Modify: `lib/validators/comment.ts`

- [ ] **Step 1: Replace UpdateCommentBodySchema with unified UpdateCommentSchema**

Replace the existing `UpdateCommentBodySchema` with a unified schema that supports `body` or `status`:

```ts
import { z } from "zod";
import { CommentStatus } from "@/generated/prisma/client";

export const CreateCommentSchema = z.object({
  body: z.string().min(1).max(5000),
  siteKey: z.string().min(1),
  slug: z.string().min(1),
  url: z.string().url().optional(),
  parentId: z.string().cuid().optional(),
});

export const UpdateCommentStatusSchema = z.object({
  status: z.nativeEnum(CommentStatus),
});

export const UpdateCommentSchema = z.object({
  body: z.string().min(1).max(5000).optional(),
  status: z.nativeEnum(CommentStatus).optional(),
}).refine((data) => data.body !== undefined || data.status !== undefined, {
  message: "Either body or status is required",
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type UpdateCommentStatusInput = z.infer<typeof UpdateCommentStatusSchema>;
export type UpdateCommentInput = z.infer<typeof UpdateCommentSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add lib/validators/comment.ts
git commit -m "feat(validators): unify update schema to support body or status"
```

---

### Task 2: Add deleteComment Service + Update Query

**Files:**
- Modify: `lib/services/comment-service.ts`

- [ ] **Step 1: Add deleteComment helper**

Add `deleteComment` after `updateCommentBody`:

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

- [ ] **Step 2: Update getApprovedCommentsForPage to include DELETED comments**

Change the `where` clause from `status: "APPROVED"` to:

```ts
const raw = await db.comment.findMany({
  where: {
    pageId: page.id,
    status: { in: ["APPROVED", "DELETED"] },
    parentId: null,
  },
  select: buildCommentSelect(userEmail),
  orderBy: { createdAt: "desc" },
});
```

Also update the `replies` include in `buildCommentSelect` to include deleted replies:

```ts
replies: {
  where: { status: { in: ["APPROVED", "DELETED"] } },
  orderBy: { createdAt: "asc" as const },
  include: { commenter: { select: buildCommenterSelect() } },
},
```

- [ ] **Step 3: Commit**

```bash
git add lib/services/comment-service.ts
git commit -m "feat(service): add deleteComment and include DELETED in widget queries"
```

---

### Task 3: Extend Widget PATCH Endpoint

**Files:**
- Modify: `app/api/widget/comments/[id]/route.ts`

- [ ] **Step 1: Update imports and schema usage**

Replace `UpdateCommentBodySchema` with `UpdateCommentSchema`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { UpdateCommentSchema } from "@/lib/validators/comment";
import { updateCommentBody, deleteComment } from "@/lib/services/comment-service";
import { verifyWidgetToken } from "@/lib/auth-widget";
import { corsHeaders } from "@/lib/cors";
import { db } from "@/lib/db";
import { ApiError, handleApiError } from "@/lib/api/error";
```

- [ ] **Step 2: Update PATCH handler to support both body and status**

Replace the existing `PATCH` function:

```ts
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new ApiError("Unauthorized", 401);
    }
    const token = authHeader.slice(7);
    const payload = await verifyWidgetToken(token);
    if (!payload) throw new ApiError("Invalid token", 401);

    const body = await req.json();
    const parsed = UpdateCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    // Verify ownership
    const comment = await db.comment.findUnique({
      where: { id },
      select: { commenterId: true },
    });
    if (!comment) throw new ApiError("Comment not found", 404);
    if (comment.commenterId !== payload.commenterId) {
      throw new ApiError("Forbidden", 403);
    }

    if (parsed.data.body !== undefined) {
      const updated = await updateCommentBody(id, parsed.data.body);
      return buildCorsResponse(req, updated);
    }

    if (parsed.data.status !== undefined) {
      const updated = await deleteComment(id);
      return buildCorsResponse(req, updated);
    }

    throw new ApiError("Invalid update", 400);
  } catch (err) {
    return handleApiError(err);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/widget/comments/\[id\]/route.ts
git commit -m "feat(api): extend widget PATCH to support status deletion"
```

---

### Task 4: Update Widget Types

**Files:**
- Modify: `widget/src/types.ts`

- [ ] **Step 1: Add DELETED to CommentData status**

```ts
export type CommentData = {
  id: string;
  body: string;
  status: "PENDING" | "APPROVED" | "DELETED";
  createdAt: string;
  editedAt: string | null;
  likeCount: number;
  hasLiked: boolean;
  parentId: string | null;
  commenter: Commenter;
  replies: CommentData[];
};
```

- [ ] **Step 2: Commit**

```bash
git add widget/src/types.ts
git commit -m "feat(widget-types): add DELETED to CommentData status"
```

---

### Task 5: Add deleteComment API Function

**Files:**
- Modify: `widget/src/api.ts`

- [ ] **Step 1: Add deleteComment function**

Add after `updateComment`:

```ts
export async function deleteComment(
  appUrl: string,
  token: string,
  commentId: string,
): Promise<CommentData> {
  const res = await fetch(`${appUrl}/api/widget/comments/${commentId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status: "DELETED" }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to delete comment");
  }
  return res.json();
}
```

- [ ] **Step 2: Commit**

```bash
git add widget/src/api.ts
git commit -m "feat(widget-api): add deleteComment function"
```

---

### Task 6: Add Widget Styles for Three-Dot Menu, Delete Confirmation, and Deleted State

**Files:**
- Modify: `widget/src/styles.css`

- [ ] **Step 1: Add three-dot menu styles**

Add after `.z-action-btn-active:hover`:

```css
/* ─── Three-dot menu ─────────────────────────────────────────────────────── */
.z-menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 6px;
  border-radius: var(--z-radius-sm);
  font-size: 12px;
  font-weight: 500;
  color: var(--z-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background-color 0.12s, color 0.12s;
  font-family: inherit;
}

.z-menu-btn:hover {
  background: var(--z-accent);
  color: var(--z-text);
}

.z-menu-dropdown {
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 4px;
  background: var(--z-bg);
  border: 1px solid var(--z-border);
  border-radius: var(--z-radius-sm);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  list-style: none;
  padding: 4px;
  min-width: 120px;
  z-index: 10;
}

.z-menu-item {
  display: block;
  width: 100%;
  padding: 6px 12px;
  border-radius: calc(var(--z-radius-sm) * 0.7);
  font-size: 13px;
  font-weight: 500;
  color: var(--z-text);
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: background-color 0.12s;
}

.z-menu-item:hover {
  background: var(--z-accent);
}

.z-menu-item-danger {
  color: #ef4444;
}

.z-menu-item-danger:hover {
  background: color-mix(in srgb, #ef4444 8%, var(--z-bg));
}

.z-comment-actions-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
```

- [ ] **Step 2: Add delete confirmation styles**

Add after `.z-inline-form-btns`:

```css
/* ─── Delete confirmation ────────────────────────────────────────────────── */
.z-delete-confirm {
  padding: 10px 12px;
  margin-top: 8px;
  background: color-mix(in srgb, #ef4444 5%, var(--z-bg));
  border: 1px solid color-mix(in srgb, #ef4444 20%, transparent);
  border-radius: var(--z-radius-sm);
}

.z-delete-confirm-text {
  font-size: 13px;
  color: var(--z-text);
  margin-bottom: 10px;
}

.z-delete-confirm-btns {
  display: flex;
  align-items: center;
  gap: 8px;
}

.z-btn-danger {
  background: #ef4444;
  color: #ffffff;
  border-color: #ef4444;
}

.z-btn-danger:hover:not(:disabled) {
  opacity: 0.88;
}
```

- [ ] **Step 3: Add "Comment Removed" state styles**

Add after `.z-pending-badge`:

```css
/* ─── Deleted comment state ──────────────────────────────────────────────── */
.z-comment-deleted {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
}

.z-comment-deleted-body {
  font-size: 13px;
  font-style: italic;
  color: var(--z-muted);
}

.z-avatar-deleted {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--z-subtle);
  border: 1px solid var(--z-border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--z-muted);
  flex-shrink: 0;
}

.z-avatar-deleted-sm {
  width: 24px;
  height: 24px;
}
```

- [ ] **Step 4: Commit**

```bash
git add widget/src/styles.css
git commit -m "feat(widget-styles): add three-dot menu, delete confirm, deleted state"
```

---

### Task 7: Add Three-Dot Menu, Delete Confirmation, and "Comment Removed" Rendering

**Files:**
- Modify: `widget/src/render.ts`

- [ ] **Step 1: Add imports**

Add `deleteComment` to the api import:
```ts
import { fetchComments, postComment, likeComment, updateComment, deleteComment } from "./api";
```

- [ ] **Step 2: Add generic deleted avatar helper**

Add after `avatarEl`:

```ts
function deletedAvatarEl(small = false): HTMLElement {
  const el = document.createElement("div");
  el.className = small
    ? "z-avatar-deleted z-avatar-deleted-sm"
    : "z-avatar-deleted";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = `<svg width="${small ? 12 : 14}" height="${small ? 12 : 14}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/></svg>`;
  return el;
}
```

- [ ] **Step 3: Update renderCommentItem signature and add deleted state rendering**

Update the function signature to include delete-related callbacks:

```ts
function renderCommentItem(
  comment: CommentData,
  depth: number,
  onReply: (comment: CommentData) => void,
  onLike: (comment: CommentData) => void,
  replyingToId: string | null,
  currentUser: Commenter | null,
  onSubmitReply: (body: string, parentId: string) => void,
  onCancelReply: () => void,
  isSubmitting: boolean,
  editingId: string | null,
  onEdit: (comment: CommentData) => void,
  onCancelEdit: () => void,
  onSubmitEdit: (commentId: string, body: string) => void,
  deletingId: string | null,
  onDelete: (comment: CommentData) => void,
  onCancelDelete: () => void,
  onConfirmDelete: (commentId: string) => void,
): HTMLElement {
```

Add after the `isEditing` check and before `if (isReplying && currentUser)`:

```ts
  if (comment.status === "DELETED") {
    const deletedWrap = document.createElement("div");
    deletedWrap.className = "z-comment-deleted";
    deletedWrap.appendChild(deletedAvatarEl(avatarSize));

    const deletedBody = document.createElement("span");
    deletedBody.className = "z-comment-deleted-body";
    deletedBody.textContent = "Comment Removed";
    deletedWrap.appendChild(deletedBody);

    li.appendChild(deletedWrap);
  }
```

- [ ] **Step 4: Replace standalone Edit button with three-dot menu**

Replace the existing Edit button block (lines ~151-158):

```ts
    if (currentUser && currentUser.id === comment.commenter.id) {
      const menuWrap = document.createElement("div");
      menuWrap.className = "z-comment-actions-wrap";

      const menuBtn = document.createElement("button");
      menuBtn.className = "z-menu-btn";
      menuBtn.type = "button";
      menuBtn.setAttribute("aria-label", "More options");
      menuBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>`;

      const dropdown = document.createElement("ul");
      dropdown.className = "z-menu-dropdown";
      dropdown.style.display = "none";

      const editItem = document.createElement("button");
      editItem.className = "z-menu-item";
      editItem.type = "button";
      editItem.textContent = "Edit";
      editItem.addEventListener("click", () => {
        dropdown.style.display = "none";
        onEdit(comment);
      });

      const deleteItem = document.createElement("button");
      deleteItem.className = "z-menu-item z-menu-item-danger";
      deleteItem.type = "button";
      deleteItem.textContent = "Delete";
      deleteItem.addEventListener("click", () => {
        dropdown.style.display = "none";
        onDelete(comment);
      });

      dropdown.appendChild(editItem);
      dropdown.appendChild(deleteItem);
      menuWrap.appendChild(menuBtn);
      menuWrap.appendChild(dropdown);
      actions.appendChild(menuWrap);

      menuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = dropdown.style.display === "block";
        dropdown.style.display = isOpen ? "none" : "block";
      });

      document.addEventListener("click", (e) => {
        if (!menuWrap.contains(e.target as Node)) {
          dropdown.style.display = "none";
        }
      });
    }
```

- [ ] **Step 5: Add delete confirmation UI**

Add after the deleted state block (after `li.appendChild(deletedWrap)`):

```ts
  if (deletingId === comment.id) {
    const confirmWrap = document.createElement("div");
    confirmWrap.className = "z-delete-confirm";

    const confirmText = document.createElement("p");
    confirmText.className = "z-delete-confirm-text";
    confirmText.textContent = "Delete this comment? This action cannot be undone.";
    confirmWrap.appendChild(confirmText);

    const btnWrap = document.createElement("div");
    btnWrap.className = "z-delete-confirm-btns";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "z-btn z-btn-ghost z-btn-sm";
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", onCancelDelete);
    btnWrap.appendChild(cancelBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "z-btn z-btn-danger z-btn-sm";
    deleteBtn.type = "button";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => onConfirmDelete(comment.id));
    btnWrap.appendChild(deleteBtn);

    confirmWrap.appendChild(btnWrap);
    li.appendChild(confirmWrap);
  }
```

- [ ] **Step 6: Update renderCommentList signature and pass new callbacks**

Update `renderCommentList` signature:

```ts
export function renderCommentList(
  comments: CommentData[],
  onReply: (comment: CommentData) => void,
  onLike: (comment: CommentData) => void,
  replyingToId: string | null,
  currentUser: Commenter | null,
  onSubmitReply: (body: string, parentId: string) => void,
  onCancelReply: () => void,
  isSubmitting: boolean,
  editingId: string | null,
  onEdit: (comment: CommentData) => void,
  onCancelEdit: () => void,
  onSubmitEdit: (commentId: string, body: string) => void,
  deletingId: string | null,
  onDelete: (comment: CommentData) => void,
  onCancelDelete: () => void,
  onConfirmDelete: (commentId: string) => void,
): HTMLElement {
```

Pass the new arguments through all `renderCommentItem` calls.

- [ ] **Step 7: Commit**

```bash
git add widget/src/render.ts
git commit -m "feat(widget-render): add three-dot menu, delete confirmation, deleted state"
```

---

### Task 8: Add deletingId State and Handlers to ZeonWidget

**Files:**
- Modify: `widget/src/index.ts`

- [ ] **Step 1: Add deleteComment to imports**

```ts
import { fetchComments, postComment, likeComment, updateComment, deleteComment } from "./api";
```

- [ ] **Step 2: Add deletingId state**

Add after `isEditingId`:

```ts
  private deletingId: string | null = null;
```

- [ ] **Step 3: Add delete handlers**

Add after `handleCancelEdit`:

```ts
  private handleDeleteClick(comment: CommentData) {
    if (this.auth.status !== "authenticated") return;
    this.deletingId = comment.id;
    this.render();
  }

  private handleCancelDelete() {
    this.deletingId = null;
    this.render();
  }

  private async handleConfirmDelete(commentId: string) {
    if (this.auth.status !== "authenticated") return;
    this.isSubmitting = true;
    this.render();
    try {
      const updated = await deleteComment(
        this.config.appUrl,
        this.auth.token,
        commentId,
      );
      const target = this.findComment(commentId);
      if (target) {
        target.status = updated.status;
        target.body = updated.body;
      }
      this.deletingId = null;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete";
      this.renderErrorBanner(message);
    } finally {
      this.isSubmitting = false;
      this.render();
    }
  }
```

- [ ] **Step 4: Update render() to pass delete callbacks**

Update the `renderCommentList` call in `render()`:

```ts
    this.root.appendChild(
      renderCommentList(
        this.comments,
        (comment) => this.handleReplyClick(comment),
        (comment) => this.handleLike(comment),
        this.replyingToId,
        this.currentUser,
        (body, parentId) => this.handleSubmit(body, parentId),
        () => this.handleCancelReply(),
        this.isSubmitting,
        this.isEditingId,
        (comment) => this.handleEditClick(comment),
        () => this.handleCancelEdit(),
        (id, body) => this.handleSubmitEdit(id, body),
        this.deletingId,
        (comment) => this.handleDeleteClick(comment),
        () => this.handleCancelDelete(),
        (id) => this.handleConfirmDelete(id),
      ),
    );
```

- [ ] **Step 5: Commit**

```bash
git add widget/src/index.ts
git commit -m "feat(widget): add delete state and handlers"
```

---

### Task 9: Update Dashboard Comments Table

**Files:**
- Modify: `components/dashboard/comments-table.tsx`

- [ ] **Step 1: Add Delete option to row actions**

Find the existing dropdown menu in the comments table row actions. Add a Delete option (in red) after Edit.

Add state for delete dialog:
```tsx
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null);
```

Add delete handler:
```tsx
const handleDelete = async () => {
  if (!commentToDelete) return;
  try {
    const res = await fetch(`/api/v1/comments/${commentToDelete.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DELETED" }),
    });
    if (!res.ok) throw new Error("Failed to delete");
    toast.success("Comment deleted");
    onStatusChange?.();
  } catch {
    toast.error("Failed to delete comment");
  } finally {
    setDeleteDialogOpen(false);
    setCommentToDelete(null);
  }
};
```

In the row dropdown menu, add:
```tsx
<DropdownMenuItem
  className="text-red-600 focus:text-red-600 focus:bg-red-50"
  onClick={() => {
    setCommentToDelete(comment);
    setDeleteDialogOpen(true);
  }}
>
  Delete
</DropdownMenuItem>
```

Add delete confirmation dialog (using existing Dialog component):
```tsx
<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Delete Comment</DialogTitle>
      <DialogDescription>
        This comment will be marked as deleted. Replies will remain visible.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
        Cancel
      </Button>
      <Button variant="destructive" onClick={handleDelete}>
        Delete
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

- [ ] **Step 2: Show "Comment Removed" for deleted comments in table**

In the body cell, conditionally render:
```tsx
<span className={comment.status === "DELETED" ? "italic text-muted-foreground" : ""}>
  {comment.status === "DELETED" ? "Comment Removed" : comment.body}
</span>
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/comments-table.tsx
git commit -m "feat(dashboard): add delete option to comments table"
```

---

### Task 10: Build Widget and Verify

**Files:**
- Build output: `public/embed.js`, `public/embed.debug.js`

- [ ] **Step 1: Build widget**

```bash
cd widget && npm run build
```

Expected: Build succeeds, `public/embed.js` and `public/embed.debug.js` updated.

- [ ] **Step 2: Verify TypeScript compilation**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit build artifacts**

```bash
git add public/embed.js public/embed.debug.js
git commit -m "feat(widget): build delete feature artifacts"
```

---

## Self-Review

**Spec coverage:**
- [x] Three-dot menu with Edit and Delete → Task 7
- [x] Delete confirmation dialog → Task 7
- [x] "Comment Removed" state with generic avatar → Task 7
- [x] Preserve replies → Task 2 (query includes DELETED), Task 7 (rendering)
- [x] Widget author can delete → Task 3 (ownership check)
- [x] Dashboard admin can delete → Task 9
- [x] Soft delete via status DELETED → Task 2, 3
- [x] Generic placeholder icon for deleted avatar → Task 7

**Placeholder scan:** No TBDs, TODOs, or vague steps. Every step has exact code.

**Type consistency:**
- `CommentData.status` updated to include `"DELETED"` → Task 4
- `UpdateCommentSchema` replaces `UpdateCommentBodySchema` → Task 1, 3
- `deleteComment` API function added → Task 5
- All callback signatures match between `render.ts`, `index.ts`, and `api.ts`

No gaps found.
