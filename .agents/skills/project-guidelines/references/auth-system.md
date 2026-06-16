# Auth System

Two separate auth systems. Never conflate them.

## Admin Auth

| Aspect | Detail |
|---|---|
| Mechanism | Auth.js v5 + Google OAuth |
| Storage | Server session cookie |
| Routes | `/dashboard`, `/api/v1/*` |
| Gate | `proxy.ts` (root, not `middleware.ts`) |
| Matcher | `/dashboard/:path*` |
| Config | `lib/auth.ts` (full, with Prisma) |
| Edge config | `lib/auth.config.ts` (no Prisma) |

**Route pattern:**
```ts
import { auth } from "@/lib/auth"
const session = await auth()
if (!session?.user?.id) throw new ApiError("Unauthorized", 401)
```

## Widget Auth

| Aspect | Detail |
|---|---|
| Mechanism | Google OAuth PKCE → Widget JWT (jose) |
| JWT Storage | `localStorage` (7-day TTL) |
| PKCE State | `sessionStorage` (OAuth flow only, cleared after) |
| Routes | `/api/widget/*` |
| Transport | `Authorization: Bearer <jwt>` |
| CORS | Enforced per `Site.allowedOrigins` |
| JWT secret | `WIDGET_JWT_SECRET` (distinct from `AUTH_SECRET`) |

**Route pattern:**
```ts
import { verifyWidgetToken } from "@/lib/auth-widget"
// OPTIONS handler always exported for CORS preflight
export async function OPTIONS() { return new Response(null, { status: 204, headers: corsHeaders(origin) }) }
// Write routes require Bearer token
const payload = verifyWidgetToken(req) // throws on invalid
```

## Permission Guards

| Guard | Location | Used By |
|---|---|---|
| `requireSiteAccess(siteId, userId, capability)` | `lib/services/membership-service.ts` | All site-scoped admin routes |
| `siteCan(role, capability)` | `lib/permissions/site.ts` | Settings visibility, role checks |
| `platformCan(role, capability)` | `lib/permissions/platform.ts` | Dashboard nav visibility |
| `isOriginAllowed(origin, allowedOriginsJson)` | `lib/cors.ts` | Widget POST routes — takes raw JSON string from `Site.allowedOrigins` |
| `getEffectiveOrigin(req)` | `lib/cors.ts` | Resolves origin from `origin` header, falls back to `referer` |
| `isCommenterBannedOnSite(...)` | `lib/services/user-service.ts` | Widget write routes |

## Critical Rules

- `WIDGET_JWT_SECRET` ≠ `AUTH_SECRET` — different secrets
- Widget uses Bearer token, no cookies — cross-origin safe
- CSRF not applicable to widget (no cookies)
- Admin routes gated by `proxy.ts`, not inline checks
- Widget every route exports `OPTIONS` handler for CORS preflight
- Widget uses `corsHeaders(origin)` on all responses
- Widget rate-limited: auth 5/min, comments 10/min via `rateLimit()`
