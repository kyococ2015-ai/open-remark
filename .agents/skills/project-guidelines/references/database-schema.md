# Database Schema Conventions

**ORM:** Prisma · **DB:** PostgreSQL · **Schema:** `prisma/schema.prisma` · **Client:** `generated/prisma`

## Rules

| Rule                  | Pattern                                                                                      |
| --------------------- | -------------------------------------------------------------------------------------------- |
| Primary key           | `@id @default(cuid())` — never autoincrement                                                 |
| Timestamps            | `createdAt DateTime @default(now())` + `updatedAt DateTime @updatedAt` on every domain model |
| Soft delete           | Status enums (`DELETED`). Never physically delete rows.                                      |
| JSON columns          | `Json` type. Never `String` with JSON.                                                       |
| Enums                 | Use for status/role/action fields. Never `String`.                                           |
| Indexes               | Every FK, every status+timestamp filter, every WHERE field                                   |
| Composite index order | Column order must match query WHERE/ORDER BY                                                 |
| Unique                | `@unique` on natural identifiers (`email`, `domain`, `siteKey`)                              |
| Cascade               | `onDelete: Cascade` for clearly child rows only                                              |

## Naming

| Element            | Convention                | Example                    |
| ------------------ | ------------------------- | -------------------------- |
| Models             | PascalCase                | `Comment`, `ModerationLog` |
| Fields             | camelCase                 | `authorName`, `createdAt`  |
| Relations (1:N)    | plural                    | `comments`, `replies`      |
| Relations (N:1)    | singular                  | `page`, `site`             |
| Enum values        | UPPER_SNAKE_CASE          | `PENDING`, `APPROVED`      |
| Self-ref relations | explicit `@relation` name | `@relation("Replies")`     |

## Normalization

Apply when creating a new model, or when adding/changing fields on an existing one.

### Always Normalize

- **Entity references** — store a foreign key to another model; never copy its fields onto this row. Duplicated data drifts out of sync.
- **Repeated or shared values** — anything reused across rows (settings, categories, statuses) belongs in its own model or an `enum`, not inline strings.
- **Distinct sub-concerns** — a cohesive cluster of fields serving one responsibility should be its own model once it grows (see "Extract when bloated").

### Denormalize Only With Justification

- Acceptable when the referenced entity genuinely has no row to point to (e.g. capturing data from an unauthenticated/guest actor with no parent record).
- Acceptable for counters or caches kept for performance — only when explicitly needed, and treat them as derived data that can be rebuilt.
- Add a comment stating _why_ the trade-off is justified, so the next reader doesn't "fix" it.

### Extract When Bloated

When a sub-concern accumulates more than ~5–6 fields, move it to a dedicated model linked 1:1 (a `@unique` FK back-reference). This keeps the parent lean and lets the sub-concern be queried independently. The same applies when editing an existing model: if a change pushes a field cluster past that threshold, extract rather than pile on.

```prisma
// Parent stays lean; the sub-concern owns its own fields.
model Parent {
  id     String  @id @default(cuid())
  name   String
  detail Detail? // optional 1:1
}

model Detail {
  id       String @id @default(cuid())
  parentId String @unique
  parent   Parent @relation(fields: [parentId], references: [id], onDelete: Cascade)
  // ...sub-concern fields...
}
```

> In this codebase, `EmbedConfig` is the live instance of this pattern (appearance fields extracted off `Site`).

## Migration Workflow

```
Edit schema → prisma validate → pnpm db:migrate --name <name> → review SQL → pnpm db:generate
```

Never edit applied migrations. Create a new one.

## Existing Enums

| Enum            | Values                                 | Used By                              |
| --------------- | -------------------------------------- | ------------------------------------ |
| `CommentStatus` | PENDING, APPROVED, SPAM, DELETED       | `Comment.status`                     |
| `PlatformRole`  | PLATFORM_OWNER, PLATFORM_USER          | `User.platformRole`                  |
| `SiteRole`      | SITE_OWNER, SITE_ADMIN, SITE_MODERATOR | `SiteMember.role`, `SiteInvite.role` |
| `InviteStatus`  | PENDING, ACCEPTED, REVOKED             | `SiteInvite.status`                  |

## Existing Models

| Model             | Relations                                                                                  | Indexes                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `User`            | has many Site, Account, Session, SiteMember                                                | `email @unique`                                                                                                         |
| `Site`            | → User; has many Page, SiteMember, SiteInvite, BannedCommenter                             | `@@index([ownerId])`, `domain @unique`, `siteKey @unique`                                                               |
| `Page`            | → Site; has many Comment                                                                   | `@@unique([siteId, slug])`, `@@index([siteId])`                                                                         |
| `Commenter`       | has many Comment, BannedCommenter                                                          | `email @unique`, `username @unique`                                                                                     |
| `Comment`         | → Page, self-ref (replies via `@relation("Replies")`); has many CommentLike, ModerationLog | `@@index([pageId, status, createdAt])`, `@@index([parentId])`, `@@index([commenterId])`, `@@index([status, createdAt])` |
| `CommentLike`     | → Comment                                                                                  | `@@unique([commentId, userEmail])`, `@@index([commentId])`                                                              |
| `ModerationLog`   | → Comment                                                                                  | `@@index([commentId, createdAt])`, `@@index([adminEmail, createdAt])`                                                   |
| `SiteMember`      | → User + Site                                                                              | `@@unique([userId, siteId])`, `@@index([userId])`, `@@index([siteId, role])`                                            |
| `SiteInvite`      | → Site                                                                                     | `@@unique([siteId, email])`, `@@index([email, status])`, `@@index([siteId])`                                            |
| `BannedCommenter` | → Site + Commenter                                                                         | `@@unique([siteId, commenterId])`, `@@index([siteId])`, `@@index([commenterId])`                                        |

## Anti-Patterns

- Auto-increment IDs → use CUID
- `String` for JSON → use `Json`
- App-level uniqueness → use `@unique`
- No index on FK → always `@@index([fk])`
- Missing `onDelete` → set explicitly
