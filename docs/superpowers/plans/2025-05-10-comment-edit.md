# Comment Edit Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add comment editing to the dashboard (admin) and widget (author-only), with an "edited" indicator.

**Architecture:** Extend existing PATCH endpoints and widget state. Add `editedAt` to `Comment`. Dashboard gets an edit dialog; widget gets inline editing similar to inline replies.

**Tech Stack:** Next.js 16, Prisma 7, PostgreSQL, React, Tailwind, vanilla JS widget

---

## File Map

| File | Responsibility |
|------|---------------|
| `prisma/schema.prisma` | Add `editedAt` to `Comment` model |
| `lib/validators/comment.ts` | Add `UpdateCommentBodySchema` |
| `lib/services/comment-service.ts` | Add `updateCommentBody()` service |
| `app/api/v1/comments/[id]/route.ts` | Extend PATCH to support body edits |
| `app/api/widget/comments/[id]/route.ts` | New PATCH endpoint for widget edits |
| `components/dashboard/comments-table.tsx` | Add Edit dialog + "edited" indicator |
| `widget/src/types.ts` | Add `editedAt` to `CommentData` |
| `widget/src/api.ts` | Add `updateComment()` API call |
| `widget/src/render.ts` | Add inline edit form + Edit button + "edited" text |
| `widget/src/index.ts` | Add `isEditingId` state and handlers |

---

### Task 1: Database Schema — Add `editedAt` to Comment

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `editedAt` field**

Add `editedAt DateTime?` to the `Comment` model. Insert it after `updatedAt`:

```prisma
model Comment {
  id        String        @id @default(cuid())
  body      String
  status    CommentStatus @default(PENDING)
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
  editedAt  DateTime?     // null = never edited

  // ... rest unchanged
}
```

- [ ] **Step 2: Validate schema**

Run: `npx prisma validate`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add editedAt to Comment"
```

---

### Task 2: Validator — UpdateCommentBodySchema

**Files:**
- Modify: `lib/validators/comment.ts`

- [ ] **Step 1: Add schema**

Add after `UpdateCommentStatusSchema`:

```typescript
export const UpdateCommentBodySchema = z.object({
  body: z.string().min(1).max(5000),
});

export type UpdateCommentBodyInput = z.infer<typeof UpdateCommentBodySchema>;
```

- [ ] **Step 2: Commit**

```bash
git add lib/validators/comment.ts
git commit -m "feat(validators): add UpdateCommentBodySchema"
```

---

### Task 3: Comment Service — updateCommentBody

**Files:**
- Modify: `lib/services/comment-service.ts`

- [ ] **Step 1: Add updateCommentBody function**

Insert after `toggleCommentLike`:

```typescript
export async function updateCommentBody(commentId: string, body: string) {
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

- [ ] **Step 2: Commit**

```bash
git add lib/services/comment-service.ts
git commit -m "feat(service): add updateCommentBody"
```

---

### Task 4: Dashboard API — Extend PATCH `/api/v1/comments/[id]`

**Files:**
- Modify: `app/api/v1/comments/[id]/route.ts`

- [ ] **Step 1: Extend PATCH handler**

Replace the entire file:

```typescript
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { UpdateCommentStatusSchema, UpdateCommentBodySchema } from "@/lib/validators/comment";
import { moderateComment } from "@/lib/services/moderation-service";
import { updateCommentBody } from "@/lib/services/comment-service";
import { handleApiError, ApiError } from "@/lib/api/error";
import { ok } from "@/lib/api/response";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.email) throw new ApiError("Unauthorized", 401);

    const body = await req.json();

    // Handle status update (existing behavior)
    if (body.status !== undefined) {
      const parsed = UpdateCommentStatusSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
      }
      const comment = await moderateComment(id, parsed.data.status, session.user.email);
      return ok(comment);
    }

    // Handle body edit (new behavior)
    if (body.body !== undefined) {
      const parsed = UpdateCommentBodySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
      }
      const comment = await updateCommentBody(id, parsed.data.body);
      return ok(comment);
    }

    throw new ApiError("Either status or body is required", 400);
  } catch (err) {
    return handleApiError(err);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/v1/comments/\[id\]/route.ts
git commit -m "feat(api): extend PATCH to support body edits in dashboard"
```

---

### Task 5: Widget API — New PATCH `/api/widget/comments/[id]`

**Files:**
- Create: `app/api/widget/comments/[id]/route.ts`

- [ ] **Step 1: Create file**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { UpdateCommentBodySchema } from "@/lib/validators/comment";
import { updateCommentBody } from "@/lib/services/comment-service";
import { verifyWidgetToken } from "@/lib/auth-widget";
import { corsHeaders } from "@/lib/cors";
import { ApiError, handleApiError } from "@/lib/api/error";

function buildCorsResponse(req: NextRequest, body: unknown, status = 200) {
  const origin = req.headers.get("origin") ?? "";
  return NextResponse.json(body, {
    status,
    headers: corsHeaders(origin),
  });
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "";
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

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
    const parsed = UpdateCommentBodySchema.safeParse(body);
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

    const updated = await updateCommentBody(id, parsed.data.body);
    return buildCorsResponse(req, updated);
  } catch (err) {
    return handleApiError(err);
  }
}
```

Note: Add `import { db } from "@/lib/db";` at the top of this file for the ownership check.

- [ ] **Step 2: Commit**

```bash
git add app/api/widget/comments/\[id\]/route.ts
git commit -m "feat(api): add PATCH endpoint for widget comment edits"
```

---

### Task 6: Dashboard UI — Edit Dialog

**Files:**
- Modify: `components/dashboard/comments-table.tsx`

- [ ] **Step 1: Update Comment type to include editedAt**

Change the Comment type:

```typescript
type Comment = {
  id: string;
  body: string;
  commenter: {
    name: string;
    email: string;
    image: string | null;
  };
  status: CommentStatus;
  createdAt: Date;
  editedAt?: Date | null;
  page: { slug: string; url: string | null };
};
```

- [ ] **Step 2: Add imports**

Add `Pencil` to the lucide-react imports:

```typescript
import { Check, MoreHorizontal, ShieldAlert, Trash2, Eye, Pencil } from "lucide-react";
```

- [ ] **Step 3: Add edit state and patch function**

Add after `deleteTarget` state:

```typescript
const [editTarget, setEditTarget] = useState<Comment | null>(null);
const [editBody, setEditBody] = useState("");
```

Add after `patchComment`:

```typescript
async function patchCommentBody(id: string, body: string) {
  const res = await fetch(`/api/v1/comments/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) throw new Error("Failed");
}
```

- [ ] **Step 4: Add Edit option to dropdown**

Insert after the "View full" item and before the first separator:

```tsx
<DropdownMenuItem onClick={() => { setEditTarget(c); setEditBody(c.body); }}>
  <Pencil className="mr-2 size-4" aria-hidden="true" />
  Edit
</DropdownMenuItem>
<DropdownMenuSeparator />
```

- [ ] **Step 5: Add edit dialog JSX**

Add after the delete dialog:

```tsx
<Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit comment</DialogTitle>
      <DialogDescription>By {editTarget?.commenter.name}</DialogDescription>
    </DialogHeader>
    <textarea
      className="w-full min-h-[100px] p-3 text-sm border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
      value={editBody}
      onChange={(e) => setEditBody(e.target.value)}
      disabled={busy === editTarget?.id}
    />
    <div className="flex gap-2 justify-end mt-2">
      <Button variant="outline" onClick={() => setEditTarget(null)}>
        Cancel
      </Button>
      <Button
        disabled={busy === editTarget?.id || !editBody.trim()}
        onClick={async () => {
          if (!editTarget) return;
          setBusy(editTarget.id);
          try {
            await patchCommentBody(editTarget.id, editBody);
            toast.success("Comment updated");
            setEditTarget(null);
            onStatusChange?.();
          } catch {
            toast.error("Update failed");
          } finally {
            setBusy(null);
          }
        }}
      >
        Save
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

- [ ] **Step 6: Show "edited" indicator in View Full dialog**

In the View Full dialog, add after the body div:

```tsx
<div className="flex items-center gap-2 mt-2">
  <p className="text-xs text-muted-foreground">
    On <span className="font-mono">{preview?.page.slug}</span>
  </p>
  {preview?.editedAt && (
    <span className="text-xs text-muted-foreground">· edited</span>
  )}
</div>
```

- [ ] **Step 7: Commit**

```bash
git add components/dashboard/comments-table.tsx
git commit -m "feat(dashboard): add comment edit dialog and edited indicator"
```

---

### Task 7: Widget Types — Add editedAt

**Files:**
- Modify: `widget/src/types.ts`

- [ ] **Step 1: Add editedAt to CommentData**

```typescript
export type CommentData = {
  id: string;
  body: string;
  status: "PENDING" | "APPROVED";
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
git commit -m "feat(widget): add editedAt to CommentData type"
```

---

### Task 8: Widget API — Add updateComment

**Files:**
- Modify: `widget/src/api.ts`

- [ ] **Step 1: Add updateComment function**

Insert after `likeComment`:

```typescript
export async function updateComment(
  appUrl: string,
  token: string,
  commentId: string,
  body: string,
): Promise<CommentData> {
  const res = await fetch(`${appUrl}/api/widget/comments/${commentId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to update comment");
  }
  return res.json();
}
```

- [ ] **Step 2: Commit**

```bash
git add widget/src/api.ts
git commit -m "feat(widget): add updateComment API function"
```

---

### Task 9: Widget Render — Inline Edit Form

**Files:**
- Modify: `widget/src/render.ts`

- [ ] **Step 1: Update renderCommentItem signature**

Add parameters for editing:

```typescript
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
  // NEW:
  editingId: string | null,
  onEdit: (comment: CommentData) => void,
  onCancelEdit: () => void,
  onSubmitEdit: (commentId: string, body: string) => void,
): HTMLElement
```

- [ ] **Step 2: Add Edit button and edited indicator in actions row**

In the actions row, after the reply button and before `right.appendChild(actions)`:

```typescript
// Show edit button only for the current user's own comments
if (currentUser && currentUser.id === comment.commenter.id) {
  const editBtn = document.createElement("button");
  editBtn.className = "z-action-btn";
  editBtn.type = "button";
  editBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg><span>Edit</span>`;
  editBtn.addEventListener("click", () => onEdit(comment));
  actions.appendChild(editBtn);
}

// Edited indicator
if (comment.editedAt) {
  const editedEl = document.createElement("span");
  editedEl.className = "z-comment-action-edited";
  editedEl.textContent = "· edited";
  actions.appendChild(editedEl);
}
```

- [ ] **Step 3: Replace body with inline edit form when editing**

Before the existing `// ─── Inline reply form ───────────────────────────────────────────` block, add:

```typescript
// ─── Inline edit form ────────────────────────────────────────────
const isEditing = editingId === comment.id;
if (isEditing) {
  const editWrap = document.createElement("div");
  editWrap.className = "z-inline-edit";
  editWrap.appendChild(
    renderInlineEditForm(
      comment,
      onSubmitEdit,
      onCancelEdit,
      isSubmitting,
    ),
  );
  li.appendChild(editWrap);
}
```

And wrap the body paragraph and actions in a check so they're hidden while editing:

Replace the body and actions creation with a conditional:

```typescript
if (!isEditing) {
  // Body
  const body = document.createElement("p");
  body.className = "z-comment-body";
  body.textContent = comment.body;
  right.appendChild(body);

  // Actions row
  const actions = document.createElement("div");
  actions.className = "z-comment-actions";

  const timeEl = document.createElement("time");
  timeEl.className = "z-comment-action-time";
  timeEl.dateTime = comment.createdAt;
  timeEl.textContent = formatRelativeTime(comment.createdAt);
  actions.appendChild(timeEl);

  const likeBtn = document.createElement("button");
  likeBtn.className = "z-action-btn" + (comment.hasLiked ? " z-action-btn-active" : "");
  likeBtn.type = "button";
  likeBtn.innerHTML = `${comment.hasLiked ? HEART_FILLED : HEART_OUTLINE}<span>${comment.likeCount}</span>`;
  likeBtn.addEventListener("click", () => onLike(comment));
  actions.appendChild(likeBtn);

  const replyBtn = document.createElement("button");
  replyBtn.className = "z-action-btn";
  replyBtn.type = "button";
  replyBtn.innerHTML = `${REPLY_ICON}<span>Reply</span>`;
  replyBtn.addEventListener("click", () => onReply(comment));
  actions.appendChild(replyBtn);

  if (currentUser && currentUser.id === comment.commenter.id) {
    const editBtn = document.createElement("button");
    editBtn.className = "z-action-btn";
    editBtn.type = "button";
    editBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg><span>Edit</span>`;
    editBtn.addEventListener("click", () => onEdit(comment));
    actions.appendChild(editBtn);
  }

  if (comment.editedAt) {
    const editedEl = document.createElement("span");
    editedEl.className = "z-comment-action-edited";
    editedEl.textContent = "· edited";
    actions.appendChild(editedEl);
  }

  right.appendChild(actions);
}
```

- [ ] **Step 4: Add renderInlineEditForm function**

Add after `renderInlineReplyForm`:

```typescript
function renderInlineEditForm(
  comment: CommentData,
  onSubmit: (commentId: string, body: string) => void,
  onCancel: () => void,
  isSubmitting: boolean,
): HTMLElement {
  const MAX_CHARS = 5000;

  const wrap = document.createElement("div");
  wrap.className = "z-inline-form";

  const textarea = document.createElement("textarea");
  textarea.value = comment.body;
  textarea.placeholder = "Edit your comment…";
  textarea.setAttribute("aria-label", "Edit comment");
  textarea.rows = 2;
  textarea.disabled = isSubmitting;
  wrap.appendChild(textarea);

  const footer = document.createElement("div");
  footer.className = "z-inline-form-footer";

  const counter = document.createElement("span");
  counter.className = "z-char-counter";
  counter.setAttribute("aria-live", "polite");
  counter.textContent = `${comment.body.length} / ${MAX_CHARS}`;
  footer.appendChild(counter);

  const btnWrap = document.createElement("div");
  btnWrap.className = "z-inline-form-btns";

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "z-btn z-btn-ghost z-btn-sm";
  cancelBtn.type = "button";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", onCancel);
  btnWrap.appendChild(cancelBtn);

  const submitBtn = document.createElement("button");
  submitBtn.className = "z-btn z-btn-primary z-btn-sm";
  submitBtn.type = "button";
  submitBtn.textContent = isSubmitting ? "Saving…" : "Save";
  submitBtn.disabled = isSubmitting;
  submitBtn.addEventListener("click", async () => {
    const body = textarea.value.trim();
    if (!body || body.length > MAX_CHARS) {
      textarea.focus();
      return;
    }
    await onSubmit(comment.id, body);
  });
  btnWrap.appendChild(submitBtn);
  footer.appendChild(btnWrap);
  wrap.appendChild(footer);

  textarea.addEventListener("input", () => {
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
    const len = textarea.value.length;
    counter.textContent = `${len} / ${MAX_CHARS}`;
    counter.classList.toggle("z-char-counter-warn", len >= MAX_CHARS * 0.9 && len < MAX_CHARS);
    counter.classList.toggle("z-char-counter-over", len > MAX_CHARS);
    submitBtn.disabled = isSubmitting || len === 0 || len > MAX_CHARS;
  });

  setTimeout(() => textarea.focus(), 0);

  return wrap;
}
```

- [ ] **Step 5: Update renderCommentList signature**

```typescript
export function renderCommentList(
  comments: CommentData[],
  onReply: (comment: CommentData) => void,
  onLike: (comment: CommentData) => void,
  replyingToId: string | null,
  currentUser: Commenter | null,
  onSubmitReply: (body: string, parentId: string) => void,
  onCancelReply: () => void,
  isSubmitting: boolean,
  // NEW:
  editingId: string | null,
  onEdit: (comment: CommentData) => void,
  onCancelEdit: () => void,
  onSubmitEdit: (commentId: string, body: string) => void,
): HTMLElement
```

Pass the new arguments through in the loop.

- [ ] **Step 6: Commit**

```bash
git add widget/src/render.ts
git commit -m "feat(widget): add inline edit form, edit button, edited indicator"
```

---

### Task 10: Widget Controller — Edit State Handlers

**Files:**
- Modify: `widget/src/index.ts`

- [ ] **Step 1: Add imports**

Add `updateComment` to the api import:

```typescript
import { fetchComments, postComment, likeComment, updateComment } from "./api";
```

- [ ] **Step 2: Add edit state**

In the `ZeonWidget` class, add after `isSubmitting`:

```typescript
private isEditingId: string | null = null;
```

- [ ] **Step 3: Add edit handlers**

Add after `handleCancelReply`:

```typescript
private handleEditClick(comment: CommentData) {
  if (this.auth.status !== "authenticated") return;
  this.isEditingId = comment.id;
  this.render();
}

private handleCancelEdit() {
  this.isEditingId = null;
  this.render();
}

private async handleSubmitEdit(commentId: string, body: string) {
  if (this.auth.status !== "authenticated") return;
  this.isSubmitting = true;
  this.render();
  try {
    const updated = await updateComment(
      this.config.appUrl,
      this.auth.token,
      commentId,
      body,
    );
    // Update local state
    const target = this.findComment(commentId);
    if (target) {
      target.body = updated.body;
      target.editedAt = updated.editedAt;
    }
    this.isEditingId = null;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update";
    this.renderErrorBanner(message);
  } finally {
    this.isSubmitting = false;
    this.render();
  }
}
```

- [ ] **Step 4: Wire into render()**

Update the `renderCommentList` call in `render()`:

```typescript
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
    // NEW:
    this.isEditingId,
    (comment) => this.handleEditClick(comment),
    () => this.handleCancelEdit(),
    (id, body) => this.handleSubmitEdit(id, body),
  ),
);
```

- [ ] **Step 5: Commit**

```bash
git add widget/src/index.ts
git commit -m "feat(widget): add edit state and handlers"
```

---

### Task 11: Widget Styles — Edit Button Styling

**Files:**
- Modify: `widget/src/styles.css`

- [ ] **Step 1: Add edit-specific styles**

Add near the end of the file (before the loading skeleton section):

```css
/* Inline edit form */
.z-inline-edit {
  margin-left: 38px;
  border-left: 2px solid var(--z-border);
  padding-left: 12px;
  margin-top: 8px;
}

.z-comment-action-edited {
  font-size: 12px;
  color: var(--z-muted);
}
```

- [ ] **Step 2: Commit**

```bash
git add widget/src/styles.css
git commit -m "feat(widget): add inline edit styles"
```

---

### Task 12: Widget Build

**Files:**
- Run build script

- [ ] **Step 1: Build widget**

Run the widget build command (check package.json for the exact script):

```bash
npm run build:widget
```

or

```bash
yarn build:widget
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Commit built assets**

```bash
git add public/embed.js public/embed.css  # or wherever built assets go
git commit -m "build(widget): rebuild with edit feature"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ Database schema `editedAt` — Task 1
- ✅ Dashboard edit dialog — Task 6
- ✅ Widget inline edit — Tasks 9, 10
- ✅ "edited" indicator — Tasks 6, 9
- ✅ API endpoints (dashboard + widget) — Tasks 4, 5
- ✅ Service layer — Task 3
- ✅ Security (author-only widget, admin dashboard) — Tasks 4, 5
- ✅ Widget types + API client — Tasks 7, 8

**2. Placeholder scan:** No TBDs, TODOs, or vague steps. All code is complete.

**3. Type consistency:** `editedAt: string | null` in types matches `editedAt: raw.editedAt?.toISOString() ?? null` in service. `updateComment` signature consistent across api.ts and index.ts.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2025-05-10-comment-edit.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
