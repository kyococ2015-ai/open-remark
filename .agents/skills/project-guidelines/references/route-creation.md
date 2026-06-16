# Route Creation

## Route Handler Template

```ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { ok, created, noContent } from "@/lib/api/response"
import { ApiError, handleApiError } from "@/lib/api/error"
import { someService } from "@/lib/services/some-service"
import { SomeSchema } from "@/lib/validators/some"

export async function GET(req: NextRequest, { params }: { params: Promise<{ siteId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new ApiError("Unauthorized", 401)
    const { siteId } = await params
    const data = await someService.doSomething(siteId)
    return ok(data)
  } catch (err) {
    return handleApiError(err)
  }
}
```

## Patterns

| Type | Path | Auth | Notes |
|---|---|---|---|
| Admin API | `app/api/v1/<resource>/route.ts` | Session cookie | No CORS needed |
| Widget API | `app/api/widget/<action>/route.ts` | Bearer JWT | Export `OPTIONS` + CORS headers |
| Dashboard page | `app/dashboard/<section>/page.tsx` | Server component | Fetch data, pass to client |
| Site page | `app/dashboard/sites/[siteId]/<section>/page.tsx` | Server component | Access check first |
| Service | `lib/services/<name>-service.ts` | N/A | No Next.js imports |
| Validator | `lib/validators/<name>.ts` | N/A | Zod schema, shared |
| Hook | `hooks/use-<name>.ts` | N/A | Client-side only |

## Widget Route Extra Pattern

```ts
import { corsHeaders } from "@/lib/cors"
import { rateLimit } from "@/lib/rate-limit"
import { verifyWidgetToken } from "@/lib/auth-widget"

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders("*") })
}

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get("origin")
    const rate = rateLimit(`widget:${ip}`, 10, 60_000)
    if (!rate.ok) throw new ApiError("Rate limit exceeded", 429)
    // ... CORS origin check, auth, service call ...
    return NextResponse.json(data, { headers: corsHeaders(origin!) })
  } catch (err) {
    return handleApiError(err)
  }
}
```

## Validation Pattern

```ts
import { SomeSchema } from "@/lib/validators/some"

const parsed = SomeSchema.safeParse(body)
if (!parsed.success) {
  const flat = parsed.error.flatten()
  const messages = [...flat.formErrors, ...Object.values(flat.fieldErrors).flat()].filter(Boolean)
  return NextResponse.json({ error: messages.join("; ") || "Validation failed" }, { status: 422 })
}
```

## Cache Revalidation

After writes that affect dashboard UI:

```ts
import { revalidatePath } from "next/cache"
revalidatePath("/dashboard", "layout")
```

## Adding a New Feature (Checklist)

- [ ] Model (if needed) with `id`, `createdAt`, `updatedAt`
- [ ] Indexes on all FKs and common query fields
- [ ] Enums for status/role fields
- [ ] Service in `lib/services/` (no Next.js imports)
- [ ] Validator in `lib/validators/` (Zod)
- [ ] Route handler (thin, try/catch + handleApiError)
- [ ] Site-scoped admin routes: call `requireSiteAccess(siteId, userId, capability)` from `membership-service`
- [ ] Widget route: OPTIONS + CORS headers + rate limiting
- [ ] `pnpm typecheck` passes
- [ ] Migration with descriptive name (if schema changed)
