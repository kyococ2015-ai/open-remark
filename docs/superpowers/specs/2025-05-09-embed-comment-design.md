# Embed Comment Design Update — Username, Reactions, Nested Replies

**Date:** 2025-05-09
**Scope:** Widget embed UI + backend changes for usernames, likes, and improved reply UX

---

## 1. Goal

Modify the current Zeon Comments widget embed to match a Twitter-like design:
- Display name **+ username** on every comment
- Add **heart reaction** button with count
- Add **reply button** with inline reply form
- Support **nested replies** for first-level replies, **parallel mentions** for deeper replies
- Use existing design tokens, no arbitrary Tailwind values

---

## 2. Database Schema

### 2.1 New `Commenter` Model

Store widget commenters separately from dashboard `User` model. Each commenter gets a unique, auto-generated username.

```prisma
model Commenter {
  id        String   @id @default(cuid())
  email     String   @unique
  username  String   @unique
  name      String
  image     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  comments Comment[]
}
```

### 2.2 Modified `Comment` Model

Remove `authorName`, `authorEmail`, `authorImage` from `Comment`. Replace with `commenterId` foreign key.

```prisma
model Comment {
  id        String        @id @default(cuid())
  body      String
  status    CommentStatus @default(PENDING)
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt

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

### 2.3 New `CommentLike` Model

```prisma
model CommentLike {
  id        String   @id @default(cuid())
  commentId String
  userEmail String
  createdAt DateTime @default(now())

  comment Comment @relation(fields: [commentId], references: [id], onDelete: Cascade)

  @@unique([commentId, userEmail])
  @@index([commentId])
}
```

### 2.4 Migration Strategy

1. Create `Commenter` table
2. Migrate unique `authorEmail` values from `Comment` into `Commenter`:
   - `email` = existing `authorEmail`
   - `name` = existing `authorName`
   - `image` = existing `authorImage`
   - `username` = derived from `name` via `generateUsername()`
3. Add `commenterId` to `Comment`, populate from migrated `Commenter` records
4. Drop `authorName`, `authorEmail`, `authorImage` from `Comment`
5. Create `CommentLike` table

---

## 3. Username Generation

### 3.1 Algorithm

```
function generateUsername(name: string): string {
  const base = name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!base) return 'user';

  let username = base;
  let counter = 2;

  while (await db.commenter.findUnique({ where: { username } })) {
    username = `${base}${counter}`;
    counter++;
  }

  return username;
}
```

### 3.2 Rules
- Derive from **first word** of full name
- Lowercase, strip non-alphanumeric
- Empty result → `"user"`
- Duplicate → append number, re-check, repeat
- Username is **immutable** after creation

### 3.3 Example
- `"Sofia Martinez"` → try `sofia` → taken → try `sofia2` → taken → try `sofia3` → free → `sofia3`

---

## 4. API Changes

### 4.1 GET `/api/widget/comments`

**Response format:**
```json
{
  "comments": [{
    "id": "...",
    "body": "...",
    "status": "APPROVED",
    "createdAt": "2025-05-09T12:00:00Z",
    "likeCount": 24,
    "hasLiked": true,
    "commenter": {
      "name": "Sofia Martinez",
      "username": "sofia",
      "image": "https://..."
    },
    "replies": [...]
  }],
  "config": {
    "theme": "AUTO",
    "primaryColor": "#0f172a",
    "radius": 8
  }
}
```

### 4.2 POST `/api/widget/comments`

**Payload:**
```json
{
  "body": "...",
  "siteKey": "...",
  "slug": "...",
  "parentId": "..."  // optional
}
```

**Auth:** JWT with `commenterId` (not just email)

**Behavior:**
- Extract `commenterId` from JWT
- Create comment with `commenterId`
- Return comment with `commenter` nested, `likeCount`, `hasLiked`

### 4.3 POST `/api/widget/comments/:id/like`

**Auth:** Required

**Behavior:** Toggle like for authenticated commenter

**Response:**
```json
{ "liked": true, "count": 25 }
```

### 4.4 Widget Auth (`/api/widget/auth`)

On Google sign-in:
1. Verify Google `id_token`
2. Upsert `Commenter`:
```ts
const commenter = await db.commenter.upsert({
  where: { email: googleEmail },
  update: {}, // username stays locked
  create: {
    email: googleEmail,
    name: googleName,
    image: googlePicture,
    username: await generateUsername(googleName),
  }
});
```
3. Issue widget JWT with `commenterId`, `name`, `image`

---

## 5. Widget JWT Changes

**Current payload:** `{ sub: email, name, image }`
**New payload:** `{ sub: email, name, image, commenterId }`

Widget stores `commenterId` in sessionStorage alongside token. All API calls include `commenterId` for ownership checks and like deduplication.

---

## 6. Widget UI Design

### 6.1 Comment Card Layout (matching reference image)

```
┌─────────────────────────────────────┐
│ [Avatar 30px] Sofia Martinez @sofia │
│              This is genuinely...     │
│ 2h ago  ♡ 24  💬 Reply              │
└─────────────────────────────────────┘
  │
  ├──┐
  │  [Avatar 24px] Daniel Okafor @danok
  │               Agreed — the spacing...
  │  1h ago  ♡ 6  💬 Reply
  │  [Reply form: "Reply to Daniel..."]
  │
```

### 6.2 Design Tokens (NO arbitrary values)

| Element | Token |
|---------|-------|
| Name | `var(--z-text)`, `font-weight: 600`, `font-size: 13px` |
| Username | `var(--z-muted)`, `font-size: 13px` |
| Body | `var(--z-text)`, `font-size: 13.5px`, `line-height: 1.65` |
| Time | `var(--z-muted)`, `font-size: 12px` |
| Avatar (top) | `30px × 30px`, `border-radius: 50%` |
| Avatar (reply) | `24px × 24px`, `border-radius: 50%` |
| Border | `1px solid var(--z-border)` |
| Reply indent | `margin-left: 38px`, `border-left: 2px solid var(--z-border)` |
| Card padding | `14px 16px` |

### 6.3 Action Buttons

**Like button:**
- Heart icon (outline when not liked, filled when liked)
- Count next to icon
- Color: liked = `var(--z-primary)`, not liked = `var(--z-muted)`
- Hover: `background: var(--z-accent)`

**Reply button:**
- Bubble icon + "Reply" text
- Color: `var(--z-muted)`
- Hover: `background: var(--z-accent)`

### 6.4 Inline Reply Form

When Reply clicked:
1. Form appears **directly under the comment card** that was clicked
2. Form has:
   - Avatar of current user (left)
   - Textarea placeholder: `"Reply to {name}..."`
   - Cancel button (ghost)
   - Reply button (primary, with send icon)
3. On submit:
   - If replying to top-level → `parentId = topComment.id`
   - If replying to nested reply → `parentId = reply.parentId`, body prefixed with `@username`

### 6.5 Reply Logic

| Click target | parentId | Body prefix | Result depth |
|-------------|----------|-------------|--------------|
| Top-level comment | `comment.id` | None | depth + 1 |
| Nested reply | `reply.parentId` | `@username ` | Same depth |

Example:
```
Sofia: "Great post"              ← Reply clicked
  [inline form]
  
  Daniel: "Agreed!"              ← Reply clicked
    [inline form]
    "@daniel thanks!"             ← posts as sibling to Daniel
```

---

## 7. State Management (Widget)

**New fields in `ZeonWidget` class:**
```ts
private replyingTo: CommentData | null = null;  // which comment has active reply form
```

**Render flow:**
1. `renderCommentItem()` receives `onReply` callback
2. When Reply clicked → `replyingTo = comment` → `render()`
3. `render()` checks if current comment === `replyingTo`, injects inline form after it
4. Cancel → `replyingTo = null` → `render()`

---

## 8. Files to Modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `Commenter`, `CommentLike`; modify `Comment` |
| `lib/services/comment-service.ts` | Update queries to use `Commenter`, include `likeCount` |
| `lib/auth-widget.ts` | Add `commenterId` to JWT payload |
| `app/api/widget/comments/route.ts` | Update GET/POST for new schema |
| `app/api/widget/auth/route.ts` | Upsert `Commenter`, generate username |
| `widget/src/types.ts` | Update `CommentData`, add `Commenter` type |
| `widget/src/api.ts` | Add `likeComment` function |
| `widget/src/render.ts` | Update comment card layout, add like/reply buttons, inline form |
| `widget/src/styles.css` | Update styles for new layout, reactions, inline form |
| `widget/src/index.ts` | Update auth state, reply logic, like handling |

---

## 9. Open Questions

None — all sections approved by user.
