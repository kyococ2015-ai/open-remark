# Banned User Embed Enforcement — Design Spec

**Date:** 2026-05-12  
**Scope:** Complete banned-user enforcement in the Zeon Comments embed widget.

## 1. Problem Statement

The `BannedCommenter` model, admin dashboard UI, and widget display for deleted comments already exist. The missing piece is **runtime enforcement**: a banned user can still post comments, like comments, and edit/delete their own comments via the widget API. Additionally, the widget does not proactively disable the comment input box or show a ban banner.

## 2. Goals

1. **Proactive UX:** If a user is banned, the embed widget immediately shows a "You're Banned" banner at the top and disables/hides the comment form on load.
2. **Backend enforcement:** All widget write endpoints (`POST` comment, `POST` like, `PATCH` comment) reject banned users with `403 Forbidden`.
3. **Defense in depth:** Even if the widget JS is bypassed or a ban happens mid-session, the backend guarantees no write operations succeed.
4. **No breaking changes:** Existing widgets and API consumers continue to work.

## 3. Non-Goals

- Changing the admin ban/unban UI or flow.
- Changing the `BannedCommenter` database schema.
- Preventing banned users from reading comments.
- Email notifications or additional ban side effects.

## 4. Architecture & Data Flow

```
Widget Load
    │
    ▼
GET /api/widget/comments?siteKey=…&slug=…
Authorization: Bearer <token>
    │
    ▼
Backend:
  1. Look up site by siteKey
  2. Verify JWT → payload (sub, name, image, commenterId)
  3. Check BannedCommenter table for (site.id, payload.commenterId)
  4. Return comments + config (theme, primaryColor, radius, currentUser.isBanned)
    │
    ▼
Widget:
  1. Read config.currentUser.isBanned
  2. If true → render "You're Banned" banner + hide comment form
  3. If false → normal behavior
```

All write endpoints independently verify the ban status before processing.

## 5. Backend Changes

### 5.1 New Helper: `isCommenterBannedOnSite`

**File:** `lib/services/user-service.ts`

```ts
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

### 5.2 `GET /api/widget/comments/route.ts`

- After extracting `userEmail` from the JWT, also extract `commenterId`.
- If both site and commenterId are present, call `isCommenterBannedOnSite(site.id, payload.commenterId)`.
- Include `currentUser: { isBanned }` in the response `config`.

**Response shape:**
```json
{
  "comments": [...],
  "config": {
    "theme": "LIGHT",
    "primaryColor": "#3b82f6",
    "radius": 8,
    "currentUser": { "isBanned": true }
  }
}
```

The `currentUser` field is omitted entirely when the request is unauthenticated.

### 5.3 `POST /api/widget/comments/route.ts`

- After `getSiteBySiteKey(parsed.data.siteKey)`, verify ban status:
  ```ts
  const isBanned = await isCommenterBannedOnSite(site.id, payload.commenterId);
  if (isBanned) throw new ApiError("Your account has been suspended on this site", 403);
  ```
- Then proceed to `createComment`.

### 5.4 `POST /api/widget/comments/[id]/like/route.ts`

- After verifying the token, look up the comment's site via:
  ```ts
  const comment = await db.comment.findUnique({
    where: { id },
    select: { page: { select: { siteId: true } } },
  });
  if (!comment) throw new ApiError("Comment not found", 404);
  ```
- Check ban status: `isCommenterBannedOnSite(comment.page.siteId, payload.commenterId)`.
- If banned, throw `ApiError("Your account has been suspended on this site", 403)`.

### 5.5 `PATCH /api/widget/comments/[id]/route.ts`

- After verifying ownership (`comment.commenterId === payload.commenterId`), additionally check ban status by looking up the comment's site and calling `isCommenterBannedOnSite`.
- If banned, throw `ApiError("Your account has been suspended on this site", 403)`.
- Then proceed with the update.

## 6. Widget Changes

### 6.1 Type Updates: `widget/src/types.ts`

Extend `WidgetThemeConfig` to include the optional `currentUser` field:

```ts
export interface WidgetThemeConfig {
  theme: string;
  primaryColor: string;
  radius: number;
  currentUser?: { isBanned: boolean };
}
```

### 6.2 State: `widget/src/index.ts`

Add a new private field to `ZeonWidget`:

```ts
private isBanned = false;
```

Update `loadComments()`:
```ts
this.isBanned = themeConfig.currentUser?.isBanned ?? false;
```

### 6.3 Rendering: `widget/src/render.ts`

Add a new exported render function:

```ts
export function renderBannedBanner(): HTMLElement {
  const banner = document.createElement("div");
  banner.className = "z-banned-banner";
  banner.setAttribute("role", "alert");
  banner.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>You're Banned`;
  return banner;
}
```

Update `ZeonWidget.render()`:
```ts
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
    renderAuthBar(this.auth, () => this.handleSignIn(), () => this.handleSignOut()),
  );

  // Only show comment form if authenticated AND not banned
  if (this.auth.status === "authenticated" && !this.isBanned) {
    this.root.appendChild(
      renderCommentForm(
        (body, parentId) => this.handleSubmit(body, parentId),
        this.replyTo,
        () => { this.replyTo = null; this.render(); },
        this.isSubmitting,
      ),
    );
  }

  this.root.appendChild(
    renderCommentList(...),
  );
}
```

### 6.4 API Error Handling: `widget/src/api.ts`

Ensure all write API helpers propagate the backend error message so the widget can show a contextual message. The `postComment`, `updateComment`, and `deleteComment` functions already read `err.error` from the JSON response. We should do the same for `likeComment`:

```ts
if (!res.ok) {
  const err = await res.json().catch(() => ({}));
  throw new Error(err.error ?? "Failed to toggle like");
}
```

### 6.5 Widget 403 Recovery: `widget/src/index.ts`

In the catch blocks of `handleSubmit`, `handleLike`, `handleSubmitEdit`, and `handleConfirmDelete`, if the error message contains "suspended" or if we detect a 403, set `this.isBanned = true` and re-render:

```ts
catch (err: unknown) {
  const message = err instanceof Error ? err.message : "Failed to post";
  if (message.toLowerCase().includes("suspended")) {
    this.isBanned = true;
    this.render();
    return;
  }
  this.renderErrorBanner(message);
}
```

## 7. Styling

Add to the widget CSS (compiled into the embed bundle):

```css
.z-banned-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  margin-bottom: 12px;
  border-radius: var(--z-radius);
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  font-size: 14px;
  font-weight: 500;
  border: 1px solid rgba(239, 68, 68, 0.2);
}
```

The red color works on both light and dark themes because it uses a fixed semantic red with low-opacity background.

## 8. Security Considerations

- **Backend is the source of truth:** The widget's `isBanned` flag is purely for UX. All write operations are gated by the backend.
- **JWT verification:** Every write endpoint already verifies the widget token before any ban check.
- **Rate limiting:** The existing rate limiter on `POST /api/widget/comments` remains in place.
- **CORS:** CORS headers continue to be applied to all responses, including `403` rejections.

## 9. Testing Checklist

- [ ] Banned user loads widget → sees "You're Banned" banner, no comment form.
- [ ] Banned user's existing comments still render (with "Account is suspended" if deleted).
- [ ] Banned user tries to POST a comment → gets `403`.
- [ ] Banned user tries to like a comment → gets `403`.
- [ ] Banned user tries to edit their comment → gets `403`.
- [ ] Banned user tries to delete their comment → gets `403`.
- [ ] Non-banned user loads widget → normal behavior, no banner.
- [ ] Unauthenticated user loads widget → no banner, sees "Sign in to comment".
- [ ] Admin bans a user who is currently on the page → user's next action shows the banner (via 403 catch).

## 10. Files Modified

| File | Change |
|------|--------|
| `lib/services/user-service.ts` | Add `isCommenterBannedOnSite` helper |
| `app/api/widget/comments/route.ts` (GET) | Return `currentUser.isBanned` in config |
| `app/api/widget/comments/route.ts` (POST) | Reject banned users with 403 |
| `app/api/widget/comments/[id]/like/route.ts` | Reject banned users with 403 |
| `app/api/widget/comments/[id]/route.ts` (PATCH) | Reject banned users with 403 |
| `widget/src/types.ts` | Extend `WidgetThemeConfig` with `currentUser` |
| `widget/src/index.ts` | Add `isBanned` state, conditional rendering, 403 recovery |
| `widget/src/render.ts` | Add `renderBannedBanner()` |
| `widget/src/api.ts` | Propagate error messages in `likeComment` |
| `widget/src/styles.css` | Add `.z-banned-banner` styles |

## 11. Deployment Notes

- Rebuild the widget bundle (`npm run build:widget` or equivalent) after widget source changes so `/public/embed.js` is updated.
- No database migration is required.
