# Coding Conventions

## Style

| Rule                | Pattern                                              |
| ------------------- | ---------------------------------------------------- |
| Indentation         | 2 spaces, no tabs                                    |
| Quotes              | Single quotes. Double only when string contains `'`. |
| Semicolons          | Always                                               |
| Variables/functions | camelCase (`getUserData`)                            |
| Components          | PascalCase (`UserProfile`)                           |
| Constants           | UPPER_SNAKE_CASE (`API_URL`)                         |
| Functional          | Prefer `map`/`filter`/`reduce`. No mutation.         |

## Architecture: Layered Request Flow

```
app/api/**          →  route handler (thin: parse, auth, call service, respond)
lib/services/**     →  business logic (NO Next.js imports)
lib/db.ts           →  Prisma singleton (only services import this)
lib/validators/     →  Zod schemas (shared by routes + services)
lib/api/            →  response.ts (ok, created, noContent) + error.ts (ApiError, handleApiError)
```

Route handlers must NOT import `lib/db.ts` directly. Services must NOT import from `next/*`.

## Server Components vs Client Components

| Aspect        | Server Component                   | Client Component                 |
| ------------- | ---------------------------------- | -------------------------------- |
| Directive     | None (default)                     | `"use client"` at top            |
| Data fetching | Direct service calls               | Receives data as props           |
| Mutations     | Not allowed                        | `fetch` to `/api/v1/*` endpoints |
| Usage         | Page shells, layouts, data loaders | Forms, tables, interactive UI    |
| State         | No useState/useEffect              | Full React hooks                 |

**Pattern:** Server component fetches data → passes to client component as props.

```tsx
// Server component (page.tsx)
export default async function CommentsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params
  const session = await auth()
  const comments = await getCommentsBySite(siteId, { page: 1, limit: 50 })
  return <CommentsTable comments={comments.items} />
}

// Client component (comments-table.tsx)
"use client"
export function CommentsTable({ comments }: { comments: Comment[] }) {
  // interactive UI, mutations, optimistic updates
}
```

## Forms

No react-hook-form. No form library. Native HTML forms + `fetch`:

```tsx
"use client"
export function GeneralSection({ site, onSiteChange }: Props) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const res = await fetch(`/api/v1/sites/${site.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: form.get('name') })
    })
    if (res.ok) onSiteChange(await res.json())
  }
  return <form onSubmit={handleSubmit}>...</form>
}
```

## Optimistic Updates

Custom hook `hooks/use-optimistic-state.ts` — do not use React's built-in `useOptimistic`:

```tsx
const { data, updateItem, revertItem, setBusy, isBusy } = useOptimisticState(comments)

const handleApprove = async (comment: Comment) => {
  const original = { ...comment }
  updateItem(c => c.id === comment.id, { status: 'APPROVED' })
  try {
    await moderateComment(comment.id, 'APPROVED')
    toast.success('Comment approved')
  } catch {
    revertItem(c => c.id === comment.id, original)
    toast.error('Failed to approve')
  } finally {
    setBusy(comment.id, false)
  }
}
```

## URL-as-State

Search/filter/pagination uses URL params. Client pushes URLs, server reads `searchParams`:

```tsx
// Client: search input pushes URL
router.push(`?search=${query}`)

// Server: page reads searchParams
export default async function Page({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const { search } = await searchParams
}
```

## Error Handling

| Layer             | Pattern                                                  |
| ----------------- | -------------------------------------------------------- |
| Route handlers    | `try { ... } catch (err) { return handleApiError(err) }` |
| Services          | `throw new ApiError("message", statusCode)`              |
| Client components | `toast.error("message")` via sonner                      |
| Error boundaries  | `error.tsx` files at route levels                        |

**ApiError codes used:** 400 (bad input), 401 (unauthorized), 403 (forbidden), 404 (not found), 409 (conflict), 429 (rate limit).

## Cache Revalidation

Routes that mutate data call `revalidatePath("/dashboard", "layout")` after writes.

## Permissions (RBAC)

Single source of truth in `lib/permissions/`:

| File                          | Purpose                                                                                       |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| `lib/permissions/site.ts`     | `SiteRole`, `SiteCapability`, `siteCan()`, `SETTINGS_SECTION_CAPABILITY`, `GrantableSiteRole` |
| `lib/permissions/platform.ts` | `PlatformRole`, `PlatformCapability`, `platformCan()`, `PLATFORM_ROUTE_CAPABILITY`            |
| `lib/permissions/index.ts`    | Barrel re-export                                                                              |

**Site roles:** `SITE_OWNER` > `SITE_ADMIN` > `SITE_MODERATOR`

**Site capabilities:** `MODERATE`, `MANAGE_SETTINGS`, `MANAGE_EMAIL_SETTINGS`, `MANAGE_MODERATORS`, `MANAGE_ADMINS`, `DELETE_SITE`, `TRANSFER_SITE`

**Platform capabilities:** `VIEW_NOTICE_BOARD`, `VIEW_ADMINISTRATION`, `MANAGE_PLATFORM_SETTINGS` (only `PLATFORM_OWNER` has any)

**Import from:** `@/lib/permissions` (barrel), never deep paths.

## Key Conventions

| Concept       | Rule                                                                                                                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DRY           | If logic used in 2+ places → extract to `lib/` or `lib/utils.ts`                                                                                                                                             |
| Config        | Feature flags in `config/config.json`. Not `.env`.                                                                                                                                                           |
| Code Comments | Always write clear and concise comments but not bloated to explain the purpose of complex code blocks, functions, or components and Clear variable and function names can often reduce the need for comments |
| Parallelism   | Use `Promise.all` for independent queries in services                                                                                                                                                        |
| Transactions  | Array form for independent batch writes, callback form for dependent sequential writes                                                                                                                       |
