# Banned User Embed Enforcement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the banned-user enforcement in the Zeon Comments embed widget by adding backend API checks, proactive widget UI, and a "You're Banned" banner.

**Architecture:** The widget's `GET /api/widget/comments` response now includes `config.currentUser.isBanned` when the request is authenticated. The widget reads this flag to immediately disable the comment form and show a banner. All write endpoints (`POST` comment, `POST` like, `PATCH` comment) independently verify the ban status and return `403` as a backstop.

**Tech Stack:** Next.js (App Router), TypeScript, Prisma/PostgreSQL, vanilla TypeScript widget (esbuild), Tailwind CSS variables (via CSS custom properties in shadow DOM).

---

## File Structure

| File | Responsibility |
|------|----------------|
| `lib/services/user-service.ts` | New `isCommenterBannedOnSite` helper |
| `app/api/widget/comments/route.ts` | GET: return `currentUser.isBanned` in config; POST: reject banned users |
| `app/api/widget/comments/[id]/like/route.ts` | POST: reject banned users |
| `app/api/widget/comments/[id]/route.ts` | PATCH: reject banned users |
| `widget/src/types.ts` | Extend `WidgetThemeConfig` with `currentUser` field |
| `widget/src/render.ts` | Add `renderBannedBanner()` function |
| `widget/src/api.ts` | Propagate error messages in `likeComment` |
| `widget/src/index.ts` | Add `isBanned` state, conditional rendering, 403 recovery |
| `widget/src/styles.css` | Add `.z-banned-banner` styles |
| `widget/build.ts` | (no changes needed) — used to rebuild bundle |

---

### Task 1: Add `isCommenterBannedOnSite` helper

**Files:**
- Modify: `lib/services/user-service.ts`

**Context:** This helper queries the `BannedCommenter` table to check if a commenter is banned on a specific site.

- [ ] **Step 1: Add the helper at the bottom of the file**

```typescript
export async function isCommenterBannedOnSite(
  siteId: string,
  commenterId: string,
): Promise<boolean> {
  const record = await db.bannedCommenter.findUnique({
    where: { siteId_commenterId: { siteId, commenterId } },
  });
  return !!record;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/services/user-service.ts
git commit -m "feat: add isCommenterBannedOnSite helper"
```

---

### Task 2: Update `GET /api/widget/comments` to return ban status

**Files:**
- Modify: `app/api/widget/comments/route.ts`

**Context:** The GET handler already verifies the optional Bearer token to extract `userEmail`. We also need to extract `commenterId` and check the ban status so the widget can proactively disable the UI.

- [ ] **Step 1: Add import for the new helper**

At the top of `app/api/widget/comments/route.ts`, add:
```typescript
import { isCommenterBannedOnSite } from "@/lib/services/user-service";
```

- [ ] **Step 2: Update the GET handler**

Replace the `GET` handler (lines 26–55) with:

```typescript
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const siteKey = searchParams.get("siteKey");
    const slug = searchParams.get("slug");
    if (!siteKey || !slug) throw new ApiError("siteKey and slug required", 400);

    const site = await getSiteBySiteKey(siteKey);

    // Extract user from optional auth header for personalized state
    let userEmail: string | undefined;
    let isBanned = false;
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const payload = await verifyWidgetToken(token);
      if (payload) {
        userEmail = payload.sub;
        isBanned = await isCommenterBannedOnSite(site.id, payload.commenterId);
      }
    }

    const comments = await getApprovedCommentsForPage(site.id, slug, userEmail);
    return buildCorsResponse(req, {
      comments,
      config: {
        theme: site.theme,
        primaryColor: site.primaryColor,
        radius: site.radius,
        currentUser: userEmail ? { isBanned } : undefined,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/widget/comments/route.ts
git commit -m "feat(widget): return currentUser.isBanned in GET /comments config"
```

---

### Task 3: Block banned users from posting comments

**Files:**
- Modify: `app/api/widget/comments/route.ts`

**Context:** The POST handler creates comments. After verifying the token and looking up the site, we must reject banned users before calling `createComment`.

- [ ] **Step 1: Add import for the new helper**

(Already added in Task 2. Skip if present.)

- [ ] **Step 2: Update the POST handler**

After line 80 (`const site = await getSiteBySiteKey(parsed.data.siteKey);`), add:

```typescript
    const isBanned = await isCommenterBannedOnSite(site.id, payload.commenterId);
    if (isBanned) {
      throw new ApiError("Your account has been suspended on this site", 403);
    }
```

The full POST handler block from lines 74–91 should now read:

```typescript
    const site = await getSiteBySiteKey(parsed.data.siteKey);

    const isBanned = await isCommenterBannedOnSite(site.id, payload.commenterId);
    if (isBanned) {
      throw new ApiError("Your account has been suspended on this site", 403);
    }

    const effectiveOrigin = getEffectiveOrigin(req);
    if (!isOriginAllowed(effectiveOrigin, site.allowedOrigins)) {
      throw new ApiError("Origin not allowed", 403);
    }

    const comment = await createComment(
      parsed.data,
      payload.commenterId,
      site.autoApprove,
    );
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/widget/comments/route.ts
git commit -m "feat(widget): block banned users from posting comments"
```

---

### Task 4: Block banned users from liking comments

**Files:**
- Modify: `app/api/widget/comments/[id]/like/route.ts`

**Context:** The like handler needs to find the comment's site and check if the user is banned there.

- [ ] **Step 1: Add imports**

At the top of the file, add:
```typescript
import { db } from "@/lib/db";
import { isCommenterBannedOnSite } from "@/lib/services/user-service";
```

- [ ] **Step 2: Update the POST handler**

Replace the entire `POST` handler body (lines 24–39) with:

```typescript
export async function POST(
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

    // Look up the comment's site to enforce ban
    const comment = await db.comment.findUnique({
      where: { id },
      select: { page: { select: { siteId: true } } },
    });
    if (!comment) throw new ApiError("Comment not found", 404);

    const isBanned = await isCommenterBannedOnSite(
      comment.page.siteId,
      payload.commenterId,
    );
    if (isBanned) {
      throw new ApiError("Your account has been suspended on this site", 403);
    }

    const result = await toggleCommentLike(id, payload.sub);
    return buildCorsResponse(req, result);
  } catch (err) {
    return handleApiError(err);
  }
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/widget/comments/\[id\]/like/route.ts
git commit -m "feat(widget): block banned users from liking comments"
```

---

### Task 5: Block banned users from editing/deleting comments

**Files:**
- Modify: `app/api/widget/comments/[id]/route.ts`

**Context:** The PATCH handler edits or deletes comments. After verifying ownership, we must also check if the user is banned on that site.

- [ ] **Step 1: Add import**

At the top of the file, add:
```typescript
import { isCommenterBannedOnSite } from "@/lib/services/user-service";
```

- [ ] **Step 2: Update the PATCH handler**

Replace the ownership check block (lines 43–51) with:

```typescript
    // Verify ownership
    const comment = await db.comment.findUnique({
      where: { id },
      select: { commenterId: true, page: { select: { siteId: true } } },
    });
    if (!comment) throw new ApiError("Comment not found", 404);
    if (comment.commenterId !== payload.commenterId) {
      throw new ApiError("Forbidden", 403);
    }

    const isBanned = await isCommenterBannedOnSite(
      comment.page.siteId,
      payload.commenterId,
    );
    if (isBanned) {
      throw new ApiError("Your account has been suspended on this site", 403);
    }
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/widget/comments/\[id\]/route.ts
git commit -m "feat(widget): block banned users from editing or deleting comments"
```

---

### Task 6: Update widget types

**Files:**
- Modify: `widget/src/types.ts`

**Context:** The `WidgetThemeConfig` type needs to include the optional `currentUser` field from the API response.

- [ ] **Step 1: Extend `WidgetThemeConfig`**

Replace the `WidgetThemeConfig` type definition (lines 42–46) with:

```typescript
export type WidgetThemeConfig = {
  theme: "AUTO" | "LIGHT" | "DARK";
  primaryColor: string;
  radius: number;
  currentUser?: { isBanned: boolean };
};
```

- [ ] **Step 2: Commit**

```bash
git add widget/src/types.ts
git commit -m "feat(widget): add currentUser to WidgetThemeConfig type"
```

---

### Task 7: Add `renderBannedBanner` to the widget renderer

**Files:**
- Modify: `widget/src/render.ts`

**Context:** A new render function creates the "You're Banned" banner DOM element. It uses the same red color scheme as existing error states.

- [ ] **Step 1: Add the new function**

Insert the following function after `renderError` (after line 756, before `renderLoadingAuthBar`):

```typescript
export function renderBannedBanner(): HTMLElement {
  const banner = document.createElement("div");
  banner.className = "z-banned-banner";
  banner.setAttribute("role", "alert");
  banner.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>You're Banned`;
  return banner;
}
```

- [ ] **Step 2: Commit**

```bash
git add widget/src/render.ts
git commit -m "feat(widget): add renderBannedBanner function"
```

---

### Task 8: Propagate error messages in `likeComment`

**Files:**
- Modify: `widget/src/api.ts`

**Context:** The `likeComment` function currently throws a generic error. We need it to propagate the backend's error message (e.g., "Your account has been suspended on this site") so the widget can react appropriately.

- [ ] **Step 1: Update the `likeComment` function**

Replace lines 47–55 with:

```typescript
export async function likeComment(
  appUrl: string,
  token: string,
  commentId: string,
): Promise<{ liked: boolean; count: number }> {
  const res = await fetch(`${appUrl}/api/widget/comments/${commentId}/like`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to toggle like");
  }
  return res.json();
}
```

- [ ] **Step 2: Commit**

```bash
git add widget/src/api.ts
git commit -m "feat(widget): propagate error messages in likeComment"
```

---

### Task 9: Add ban state and conditional rendering to the widget

**Files:**
- Modify: `widget/src/index.ts`

**Context:** The main widget class needs to track `isBanned`, read it from the API response, conditionally render the banner and comment form, and recover from mid-session bans by catching 403 errors.

- [ ] **Step 1: Add `renderBannedBanner` to imports**

Update the import from `render.ts` (line 10) to include `renderBannedBanner`:

```typescript
import {
  renderAuthBar,
  renderCommentForm,
  renderCommentList,
  renderError,
  renderLoading,
  renderLoadingAuthBar,
  renderBannedBanner,
} from "./render";
```

- [ ] **Step 2: Add `isBanned` state field**

After line 100 (`private isSubmitting = false;`), add:

```typescript
  private isBanned = false;
```

- [ ] **Step 3: Update `loadComments` to read ban status**

Replace lines 138–154 with:

```typescript
  private async loadComments() {
    this.renderLoadingState();
    try {
      const { comments, config: themeConfig } = await fetchComments(
        this.config.appUrl,
        this.config.siteKey,
        this.config.slug,
        this.token,
      );
      this.themeStyle.textContent = buildThemeStyle(themeConfig);
      saveCachedTheme(this.config.siteKey, themeConfig);
      this.isBanned = themeConfig.currentUser?.isBanned ?? false;
      this.comments = comments;
      this.render();
    } catch {
      this.renderErrorState("Failed to load comments. Please try again later.");
    }
  }
```

- [ ] **Step 4: Update `handleSubmit` to catch 403 / ban errors**

Replace lines 185–227 with:

```typescript
  private async handleSubmit(body: string, parentId?: string) {
    if (this.auth.status !== "authenticated") return;
    this.isSubmitting = true;
    this.render();
    try {
      let finalBody = body;
      let finalParentId = parentId;
      if (parentId) {
        const target = this.findComment(parentId);
        if (target && target.commenter) {
          const isNestedReply = this.findParentComment(parentId) !== null;
          if (isNestedReply) {
            finalBody = `@${target.commenter.username} ${body}`;
            finalParentId = target.parentId ?? parentId;
          }
        }
      }

      const comment = await postComment(this.config.appUrl, this.auth.token, {
        body: finalBody,
        siteKey: this.config.siteKey,
        slug: this.config.slug,
        parentId: finalParentId,
      });

      if (finalParentId) {
        const parent = this.comments.find((c) => c.id === finalParentId);
        if (parent) {
          parent.replies = [...(parent.replies ?? []), comment];
        }
      } else {
        this.comments = [comment, ...this.comments];
      }
      this.replyTo = null;
      this.replyingToId = null;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to post";
      if (message.toLowerCase().includes("suspended")) {
        this.isBanned = true;
        this.render();
        return;
      }
      this.renderErrorBanner(message);
    } finally {
      this.isSubmitting = false;
      this.render();
    }
  }
```

- [ ] **Step 5: Update `handleLike` to catch 403 / ban errors**

Replace lines 229–246 with:

```typescript
  private async handleLike(comment: CommentData) {
    if (this.auth.status !== "authenticated") {
      this.handleSignIn();
      return;
    }
    try {
      const result = await likeComment(
        this.config.appUrl,
        this.auth.token,
        comment.id,
      );
      comment.hasLiked = result.liked;
      comment.likeCount = result.count;
      this.render();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update like";
      if (message.toLowerCase().includes("suspended")) {
        this.isBanned = true;
        this.render();
        return;
      }
      this.renderErrorBanner("Failed to update like");
    }
  }
```

- [ ] **Step 6: Update `handleConfirmDelete` to catch 403 / ban errors**

Replace lines 301–324 with:

```typescript
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
      if (message.toLowerCase().includes("suspended")) {
        this.isBanned = true;
        this.render();
        return;
      }
      this.renderErrorBanner(message);
    } finally {
      this.isSubmitting = false;
      this.render();
    }
  }
```

- [ ] **Step 7: Update `handleSubmitEdit` to catch 403 / ban errors**

Replace lines 326–350 with:

```typescript
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
      const target = this.findComment(commentId);
      if (target) {
        target.body = updated.body;
        target.editedAt = updated.editedAt;
      }
      this.isEditingId = null;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update";
      if (message.toLowerCase().includes("suspended")) {
        this.isBanned = true;
        this.render();
        return;
      }
      this.renderErrorBanner(message);
    } finally {
      this.isSubmitting = false;
      this.render();
    }
  }
```

- [ ] **Step 8: Update `render` to show banner and conditionally hide comment form**

Replace lines 390–440 with:

```typescript
  private render() {
    this.root.innerHTML = "";
    this.root.appendChild(this.buildHeader());

    if (this.isBanned) {
      this.root.appendChild(renderBannedBanner());
    }

    if (this.auth.status === "error") {
      this.root.appendChild(renderError(this.auth.message));
    }

    this.root.appendChild(
      renderAuthBar(
        this.auth,
        () => this.handleSignIn(),
        () => this.handleSignOut(),
      ),
    );

    if (this.auth.status === "authenticated" && !this.isBanned) {
      this.root.appendChild(
        renderCommentForm(
          (body, parentId) => this.handleSubmit(body, parentId),
          this.replyTo,
          () => {
            this.replyTo = null;
            this.render();
          },
          this.isSubmitting,
        ),
      );
    }

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
  }
```

- [ ] **Step 9: Verify widget compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 10: Commit**

```bash
git add widget/src/index.ts
git commit -m "feat(widget): add isBanned state, banner, conditional form, 403 recovery"
```

---

### Task 10: Add banned banner styles

**Files:**
- Modify: `widget/src/styles.css`

**Context:** The banner needs styling that works on both light and dark themes. We use the same red semantic color as the existing `.z-error` class.

- [ ] **Step 1: Add `.z-banned-banner` styles**

Insert after the `.z-error` styles (after line 793, before the Accessibility section):

```css
/* ─── Banned banner ──────────────────────────────────────────────────────── */
.z-banned-banner {
  padding: 10px 16px;
  background: color-mix(in srgb, #ef4444 10%, var(--z-bg));
  color: #b91c1c;
  font-size: 13px;
  font-weight: 600;
  border-bottom: 1px solid color-mix(in srgb, #ef4444 20%, transparent);
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (prefers-color-scheme: dark) {
  :host .z-banned-banner {
    color: #fca5a5;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add widget/src/styles.css
git commit -m "feat(widget): add banned banner styles"
```

---

### Task 11: Rebuild widget bundle

**Files:**
- (Generated): `public/embed.js`, `public/embed.debug.js`

**Context:** The widget source is compiled into `public/embed.js` (minified) and `public/embed.debug.js` (non-minified) by the build script.

- [ ] **Step 1: Run the widget build**

```bash
npm run widget:build
```

Expected output:
```
✘ [ERROR] The build was canceled
```
(or esbuild success messages — the script uses top-level await, so output may vary by Node version)

If `npm run widget:build` fails, try:
```bash
npx tsx widget/build.ts
```

- [ ] **Step 2: Verify the generated files exist and have recent timestamps**

```bash
ls -la public/embed.js public/embed.debug.js
```

Expected: Both files exist with timestamps from just now.

- [ ] **Step 3: Commit**

```bash
git add public/embed.js public/embed.debug.js
git commit -m "build: rebuild widget bundle with banned user enforcement"
```

---

## Spec Self-Review

### Coverage Check

| Spec Requirement | Plan Task |
|------------------|-----------|
| `isCommenterBannedOnSite` helper | Task 1 |
| GET returns `currentUser.isBanned` | Task 2 |
| POST comment rejects banned | Task 3 |
| POST like rejects banned | Task 4 |
| PATCH edit/delete rejects banned | Task 5 |
| Widget type update | Task 6 |
| `renderBannedBanner` | Task 7 |
| `likeComment` error propagation | Task 8 |
| Widget `isBanned` state + render + 403 recovery | Task 9 |
| Banner styles | Task 10 |
| Rebuild bundle | Task 11 |

### Placeholder Scan
- No TBD, TODO, or incomplete sections.
- Every code step contains the actual code to write.
- Every test/verification step has an exact command and expected output.

### Type Consistency
- `WidgetThemeConfig.currentUser` is `{ isBanned: boolean }` everywhere.
- `isCommenterBannedOnSite(siteId, commenterId)` signature is consistent across all API routes.
- Error message `"Your account has been suspended on this site"` is identical in backend and checked via `.includes("suspended")` in frontend.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-12-banned-user-embed.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
