# Architecture Overview

## System diagram

```
┌─────────────────────────────────────────────────────────┐
│  Static Site (Astro / Hugo / Next.js)                   │
│                                                         │
│  <div data-zeon-comments                                │
│       data-site-key="zk_abc"                            │
│       data-slug="/posts/hello">                         │
│  <script src="https://app.com/embed.js">                │
│                            │                            │
└────────────────────────────┼────────────────────────────┘
                             │ HTTP (CORS)
                             ▼
┌─────────────────────────────────────────────────────────┐
│  Zeon Comments Server (Next.js)                         │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ /api/widget/ │  │  /api/v1/    │  │  /dashboard  │  │
│  │  (public)    │  │  (admin)     │  │  (admin UI)  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                  │          │
│         └─────────────────┴──────────────────┘          │
│                           │                             │
│                    ┌──────▼──────┐                      │
│                    │  Services   │                      │
│                    │  (lib/)     │                      │
│                    └──────┬──────┘                      │
│                           │                             │
│                    ┌──────▼──────┐                      │
│                    │   Prisma    │                      │
│                    └──────┬──────┘                      │
│                           │                             │
│                    ┌──────▼──────┐                      │
│                    │   SQLite    │                      │
│                    │ (Postgres   │                      │
│                    │  in prod)   │                      │
│                    └─────────────┘                      │
└─────────────────────────────────────────────────────────┘
```

## Request flow — visitor posts a comment

```
1. embed.js mounts on [data-zeon-comments]
2. GET /api/widget/comments?siteKey=…&slug=…
   → Returns approved comments (no auth required)
3. Visitor clicks "Continue with Google"
   → Popup opens accounts.google.com OAuth
   → Popup redirects to /api/widget/oauth-callback
   → Callback page reads id_token from URL fragment
   → postMessage({type: "ZEON_GOOGLE_TOKEN", idToken}) to opener
   → embed.js calls POST /api/widget/auth with {idToken}
   → Server verifies token with Google tokeninfo API
   → Server issues a signed Widget JWT (7-day expiry)
   → JWT stored in sessionStorage
4. Visitor submits comment
   → POST /api/widget/comments
     Authorization: Bearer <widget-jwt>
   → Server verifies JWT, checks origin allowlist
   → Rate limit check (10 req/min per IP)
   → Comment sanitized + saved (status: PENDING or APPROVED)
   → 201 response
5. Dashboard: admin approves → PATCH /api/v1/comments/:id
   → ModerationLog entry created
   → Comment status → APPROVED → visible to all
```

## Authentication — two separate systems

| System | Who | Mechanism | Storage |
|--------|-----|-----------|---------|
| Admin auth | Site owners | Auth.js v5 + Google OAuth → session cookie | Server session |
| Widget auth | Visitors (commenters) | Google id_token → Widget JWT | `sessionStorage` |

Admin routes gated by `middleware.ts` checking Auth.js session.
Widget routes use `Authorization: Bearer <jwt>` header — no cookies (cross-origin).

## Layered architecture

```
Route Handler       app/api/**         thin: parse, auth, call service
     ↓
Service Layer       lib/services/      business logic, no Next.js imports
     ↓
Prisma Client       lib/db.ts          singleton, only services use it
     ↓
SQLite / Postgres
```

**Rule:** Route handlers ≤ 25 lines. All logic in services. Validators (Zod) shared by both.

## Widget architecture

The embed widget is a self-contained vanilla TypeScript bundle:

- **Shadow DOM** — styles isolated, no leakage in or out
- **No framework** — plain DOM APIs, ~22 KB unminified
- **State machine** — simple class managing auth state, comments, reply target
- **CSS custom properties** — themeable via `--zeon-*` variables on `:host`
- **Dark mode** — `prefers-color-scheme` media query in shadow CSS
- **Reduced motion** — transitions disabled when `prefers-reduced-motion: reduce`

## Security model

| Threat | Mitigation |
|--------|-----------|
| Cross-site comment spam | CORS allowlist per site (`Site.allowedOrigins`) |
| Anonymous spam | Google OAuth required to post |
| Widget JWT theft | Short-lived (7d), stored in sessionStorage (not localStorage), not httpOnly (cross-origin limitation) |
| SQL injection | Prisma parameterized queries |
| XSS in comments | Body sanitized server-side (HTML stripped), rendered as `textContent` in widget |
| CSRF | Widget uses Bearer token (not cookies) — CSRF not applicable |
| Rate abuse | 10 posts/min per IP via in-memory LRU rate limiter |
| Admin route access | `middleware.ts` checks Auth.js session for all `/dashboard` paths |

## Data model summary

```
User ──< Site ──< Page ──< Comment ──< Comment (replies)
                               │
                               └──< ModerationLog
```

- `Site.siteKey` — public identifier embedded in static sites
- `Site.allowedOrigins` — JSON array, enforced on widget POST
- `Comment.status` — PENDING | APPROVED | SPAM | DELETED (soft delete)
- `ModerationLog` — audit trail of every admin action

## Scaling path

| Component | Current | Scale-up path |
|-----------|---------|---------------|
| Database | SQLite (libsql) | Change 1 line in prisma.config.ts + schema → Postgres |
| Rate limiting | In-memory LRU | Replace `lib/rate-limit.ts` with Redis/Upstash |
| Widget auth | Google tokeninfo API | Cache responses, add other OAuth providers |
| Comments | Full fetch per load | Add cursor pagination + real-time via SSE |
| Widget bundle | Single file | CDN-hosted with long-lived cache headers |
