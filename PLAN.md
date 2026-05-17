# Open Remark — Architecture Plan

## Overview

Multi-tenant comment SaaS. Site owner registers → gets embed snippet → pastes into Astro/Hugo/Next.js site → visitors sign in with Google → post comments → owner moderates via dashboard.

```
[Static Site]  ──embed.js──>  [Next.js Widget API]
                                      |
                               [Prisma / SQLite]
                                      |
                              [Admin Dashboard]
```

---

## Tech Stack

| Layer         | Choice                         | Reason                                        |
| ------------- | ------------------------------ | --------------------------------------------- |
| Framework     | Next.js 16 App Router          | Already scaffolded                            |
| Database      | SQLite (dev) → Postgres (prod) | Simple start; Prisma swaps provider in 1 line |
| ORM           | Prisma                         | Type-safe, migrations, easy swap              |
| Admin Auth    | Auth.js v5 (next-auth@beta)    | Google OAuth, Prisma adapter                  |
| Widget Auth   | Short-lived JWT (Bearer)       | Cross-origin embeds can't use cookies         |
| UI            | shadcn/ui + Tailwind v4        | Already wired                                 |
| Validation    | Zod                            | Shared client+server schemas                  |
| Widget Bundle | Vanilla TS → esbuild           | Zero deps, works in any static site           |
| Rate Limit    | In-memory LRU (v1)             | Pluggable; swap to Redis later                |

---

## Data Models

```prisma
model User {
  id        String    @id @default(cuid())
  email     String    @unique
  name      String?
  image     String?
  role      Role      @default(OWNER)
  sites     Site[]
  accounts  Account[]
  sessions  Session[]
  createdAt DateTime  @default(now())
}

model Site {
  id             String    @id @default(cuid())
  name           String
  domain         String
  siteKey        String    @unique @default(cuid())
  allowedOrigins String[]  // JSON array of allowed origins
  autoApprove    Boolean   @default(false)
  owner          User      @relation(fields: [ownerId], references: [id])
  ownerId        String
  pages          Page[]
  createdAt      DateTime  @default(now())
}

model Page {
  id        String    @id @default(cuid())
  slug      String
  url       String?
  site      Site      @relation(fields: [siteId], references: [id])
  siteId    String
  comments  Comment[]
  createdAt DateTime  @default(now())
  @@unique([siteId, slug])
}

model Comment {
  id          String        @id @default(cuid())
  body        String
  authorName  String
  authorEmail String
  authorImage String?
  status      CommentStatus @default(PENDING)
  page        Page          @relation(fields: [pageId], references: [id])
  pageId      String
  parent      Comment?      @relation("Replies", fields: [parentId], references: [id])
  parentId    String?
  replies     Comment[]     @relation("Replies")
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}

model ModerationLog {
  id         String   @id @default(cuid())
  commentId  String
  action     String
  adminEmail String
  createdAt  DateTime @default(now())
}

enum Role           { OWNER ADMIN }
enum CommentStatus  { PENDING APPROVED SPAM DELETED }

// NextAuth required models: Account, Session, VerificationToken
```

---

## Folder Structure

```
open-remark/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
│
├── public/
│   ├── embed.js              # built widget (esbuild output)
│   └── demo.html             # integration demo page
│
├── app/
│   ├── (marketing)/          # public landing page
│   │   └── page.tsx
│   │
│   ├── (auth)/               # admin sign-in
│   │   └── sign-in/
│   │       └── page.tsx
│   │
│   ├── (dashboard)/          # protected admin area
│   │   ├── layout.tsx        # sidebar shell
│   │   ├── page.tsx          # redirect → /sites
│   │   ├── sites/
│   │   │   ├── page.tsx              # list owned sites
│   │   │   ├── new/page.tsx          # register new site
│   │   │   └── [siteId]/
│   │   │       ├── page.tsx          # site overview stats
│   │   │       ├── comments/
│   │   │       │   └── page.tsx      # moderation queue
│   │   │       ├── settings/
│   │   │       │   └── page.tsx      # edit site, origins
│   │   │       └── install/
│   │   │           └── page.tsx      # embed snippet + docs
│   │   └── account/
│   │       └── page.tsx
│   │
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/route.ts
│   │   ├── v1/                        # versioned API
│   │   │   ├── sites/
│   │   │   │   ├── route.ts           # GET list, POST create
│   │   │   │   └── [siteId]/
│   │   │   │       └── route.ts       # GET, PATCH, DELETE
│   │   │   └── comments/
│   │   │       ├── route.ts           # admin: GET all with filters
│   │   │       └── [id]/
│   │   │           └── route.ts       # PATCH status, DELETE
│   │   └── widget/                    # CORS-open, used by embed.js
│   │       ├── comments/
│   │       │   └── route.ts           # GET thread, POST new comment
│   │       └── auth/
│   │           └── route.ts           # issue widget JWT
│   │
│   ├── layout.tsx
│   └── globals.css
│
├── components/
│   ├── ui/                   # shadcn primitives (auto-generated)
│   ├── dashboard/
│   │   ├── app-sidebar.tsx
│   │   ├── site-stats-card.tsx
│   │   ├── comments-table.tsx
│   │   ├── comments-filter-bar.tsx
│   │   ├── site-card.tsx
│   │   └── install-snippet.tsx
│   ├── comments/
│   │   ├── comment-list.tsx
│   │   ├── comment-item.tsx
│   │   └── comment-form.tsx
│   ├── marketing/
│   │   └── hero.tsx
│   └── theme-provider.tsx
│
├── lib/
│   ├── db.ts                 # Prisma client singleton
│   ├── auth.ts               # Auth.js config
│   ├── auth-widget.ts        # JWT sign/verify for widget
│   ├── cors.ts               # origin allowlist checker
│   ├── rate-limit.ts         # in-memory rate limiter
│   ├── sanitize.ts           # comment body sanitisation
│   ├── validators/
│   │   ├── comment.ts        # Zod: CreateComment, UpdateComment
│   │   └── site.ts           # Zod: CreateSite, UpdateSite
│   ├── api/
│   │   ├── error.ts          # ApiError class + handler
│   │   └── response.ts       # ok(), created(), noContent()
│   └── services/
│       ├── comment-service.ts
│       ├── site-service.ts
│       └── moderation-service.ts
│
├── hooks/
│   ├── use-comments.ts
│   └── use-sites.ts
│
├── widget/                   # source for public/embed.js
│   ├── src/
│   │   ├── index.ts          # mount point
│   │   ├── api.ts            # fetch helpers
│   │   ├── auth.ts           # google popup + JWT
│   │   ├── render.ts         # DOM rendering
│   │   └── styles.css        # scoped via shadow DOM
│   ├── tsconfig.json
│   └── build.ts              # esbuild script
│
├── tests/
│   ├── unit/                 # service + validator tests
│   ├── api/                  # route handler tests
│   └── e2e/                  # playwright
│
├── docs/
│   ├── architecture.md
│   ├── embed-astro.md
│   ├── embed-hugo.md
│   ├── embed-nextjs.md
│   └── contributing.md
│
├── middleware.ts              # gate /dashboard, rate limit
├── .env.example
├── PLAN.md                   # this file
└── ...config files
```

---

## Architecture Layers

```
Route Handler   (thin: parse req, auth check, call service, return response)
      ↓
Service Layer   (business logic, no Next.js imports → unit-testable)
      ↓
Prisma Client   (db.ts singleton, only services touch it)
      ↓
SQLite / Postgres
```

**Rule:** Route handlers ≤ 25 lines. All logic in services. Validators shared by routes + services.

---

## Key Flows

### 1. Owner Onboarding

1. Visit `/sign-in` → Google OAuth → session created
2. `/dashboard/sites/new` → POST `/api/v1/sites` → `siteKey` generated
3. `/dashboard/sites/[id]/install` → copyable `<script>` snippet

### 2. Embed Snippet (what users paste)

```html
<div
  data-open-remark
  data-site-key="zk_abc123"
  data-slug="/posts/hello-world"
></div>
<script async src="https://your-domain.com/embed.js"></script>
```

### 3. Visitor Commenting

1. `embed.js` mounts → `GET /api/widget/comments?siteKey=...&slug=...` → render thread
2. "Sign in with Google" → popup → `POST /api/widget/auth` → widget JWT (localStorage)
3. Write comment → `POST /api/widget/comments` with `Authorization: Bearer <jwt>`
4. Status = `PENDING` (if moderation on) or `APPROVED`

### 4. Moderation

1. Dashboard → comments table → filter `PENDING`
2. Approve / Spam / Delete → `PATCH /api/v1/comments/[id]`
3. ModerationLog entry created

---

## Security Checklist

- [x] CORS allowlist per site (`Site.allowedOrigins`)
- [x] Origin header checked on every widget POST
- [x] Widget auth via Bearer JWT (no cookie = no CSRF)
- [x] Rate limit per IP + per siteKey
- [x] Comment body sanitised server-side (strip HTML)
- [x] Prisma parameterised queries (SQL injection N/A)
- [x] Admin routes gated in `middleware.ts`
- [x] `siteKey` public-readable; writes need JWT

---

## Build Phases

| Phase | Scope                              | Est. |
| ----- | ---------------------------------- | ---- |
| 0     | Deps, Prisma, NextAuth, middleware | 1-2d |
| 1     | Dashboard shell + Sites CRUD       | 2-3d |
| 2     | Services + all API routes          | 2d   |
| 3     | Moderation UI (table, filters)     | 2d   |
| 4     | Widget (embed.js, esbuild, demo)   | 3d   |
| 5     | Docs, seed, polish                 | 1-2d |

---

## Environment Variables

```env
# .env.example
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="change-me"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
WIDGET_JWT_SECRET="change-me"
APP_URL="http://localhost:3000"
```

---

## Open Decisions

| Question                     | Default         |
| ---------------------------- | --------------- |
| Moderation default           | Pre-moderate on |
| Free tier limits             | TBD             |
| Self-hosted option           | No (v1)         |
| Custom widget theme per site | CSS vars (v1)   |
| Postgres migration           | Phase 6         |
