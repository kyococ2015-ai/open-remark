# Agent Instructions: Database Schema & Migrations

> **Purpose:** This file documents the database conventions, patterns, and workflows for this project. Any AI assistant modifying the Prisma schema MUST follow these rules.

---

## Project Context

- **ORM:** Prisma (with `prisma-client` generator)
- **Database:** PostgreSQL
- **Schema Location:** `prisma/schema.prisma`
- **Generated Client:** `generated/prisma`
- **Auth:** NextAuth.js v5 (Auth.js) — requires specific models (`User`, `Account`, `Session`, `VerificationToken`)

---

## Schema Conventions

### 1. Primary Keys
- **Always use CUID** (`@id @default(cuid())`) — never auto-increment integers
- CUIDs are required for distributed systems, safer IDs in URLs, and easier data merging

### 2. Naming Conventions
- **Models:** PascalCase (`Comment`, `ModerationLog`)
- **Fields:** camelCase (`authorName`, `createdAt`)
- **Relations:** Use plural for 1:N (`comments`, `replies`), singular for N:1 (`page`, `site`)
- **Enum values:** UPPER_SNAKE_CASE (`PENDING`, `APPROVED`)
- **Self-referential relations:** Use explicit relation names (`@relation("Replies")`)

### 3. Timestamps
Every domain model MUST include:
```prisma
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
```

### 4. Soft Deletes
- **Do NOT physically delete domain data** unless explicitly requested
- Use status enums for logical deletion (e.g., `CommentStatus.DELETED`)
- `onDelete: Cascade` is acceptable for relational/child data (pages → comments, sites → pages)

### 5. JSON Data
- Since we use **PostgreSQL**, use native `Json` type — NOT `String` with JSON text
- Bad: `allowedOrigins String @default("[]")`
- Good: `allowedOrigins Json @default("[]")`

---

## Normalization Rules

### Always Normalize These
- **User/author references** — never duplicate user profile data across records
- **Configuration/settings** — extract from main entity if > 3 fields (see EmbedConfig pattern below)
- **Lookup values** — use enums or reference tables

### Acceptable Denormalization (with justification)
- **Guest comment authors** (`authorName`, `authorEmail` on `Comment`) — guests have no `User` record, so storing on the comment itself is acceptable
- **Counters/caches** — only if explicitly requested for performance

### Extract When Bloated
If a model accumulates > 5-6 fields for a sub-concern, extract to a dedicated model:
```prisma
// Instead of piling appearance fields on Site:
model Site {
  id          String      @id @default(cuid())
  name        String
  domain      String      @unique
  embedConfig EmbedConfig?
  // ...
}

model EmbedConfig {
  id           String @id @default(cuid())
  siteId       String @unique
  site         Site   @relation(fields: [siteId], references: [id])
  theme        String @default("AUTO")
  primaryColor String @default("#0f172a")
  radius       Int    @default(8)
}
```

---

## Indexing Policy (CRITICAL)

### Rule: Every New Model Must Have Indexes

Before declaring a schema change "complete", verify indexes exist for:

1. **All foreign keys** — automatically queryable via relation
2. **All status + timestamp filters** — the most common query pattern
3. **All lookup fields used in WHERE clauses**
4. **Composite indexes** for multi-column filters (order matters!)

### Index Ordering Rules
For composite indexes, column order MUST match query patterns:
```prisma
// Query: WHERE pageId = ? AND status = ? ORDER BY createdAt DESC
// Index columns MUST be in this exact order:
@@index([pageId, status, createdAt])

// Wrong order (won't help the query above):
@@index([status, pageId, createdAt])
```

### Index Checklist by Model

| If you add... | You MUST index... |
|---------------|-------------------|
| `siteId` foreign key | `@@index([siteId])` |
| `pageId` + `status` | `@@index([pageId, status, createdAt])` |
| `parentId` (self-ref) | `@@index([parentId])` |
| `ownerId` / `userId` | `@@index([ownerId])` |
| `authorEmail` | `@@index([authorEmail])` |
| `adminEmail` + timestamp | `@@index([adminEmail, createdAt])` |
| `commentId` + timestamp | `@@index([commentId, createdAt])` |

### When NOT to Index
- Columns with very low cardinality (boolean flags alone)
- Columns rarely used in WHERE/JOIN/ORDER BY
- Write-heavy tables where read speed is not critical

---

## Constraints & Uniqueness

- **Natural unique identifiers** MUST have `@unique` (`email`, `domain`, `siteKey`)
- **Composite unique** for scoped uniqueness: `@@unique([siteId, slug])`
- **Never rely on application-level uniqueness checks** — always enforce in schema

---

## Enum Usage

- Use enums for fields with a **closed set of values** that change < 1x per quarter
- **Never use `String`** for status, role, or action types
- Example:
```prisma
enum CommentStatus {
  PENDING
  APPROVED
  SPAM
  DELETED
}

enum ModerationAction {
  APPROVE
  REJECT
  DELETE
  MARK_SPAM
}
```

---

## Migration Workflow

### Step 1: Edit Schema
Modify `prisma/schema.prisma` following all conventions above.

### Step 2: Validate
```bash
npx prisma validate
```
Must pass with no warnings.

### Step 3: Create Migration
```bash
npx prisma migrate dev --name <descriptive_name>
```

### Step 4: Review Generated SQL
Before applying, review the migration SQL file to ensure:
- Indexes are created correctly
- No accidental data loss
- `CASCADE` behavior is intentional

### Step 5: Generate Client
```bash
npx prisma generate
```

### Step 6: Verify in Application
Run the app and verify the changes work end-to-end.

---

## Adding New Features (Checklist)

When adding a new feature that touches the database:

- [ ] New model added (if needed) with `id`, `createdAt`, `updatedAt`
- [ ] All foreign keys have `@@index()`
- [ ] Composite indexes for common query patterns
- [ ] Enums used instead of String for fixed values
- [ ] `@unique` on natural identifiers
- [ ] `onDelete` behavior explicitly set on all relations
- [ ] `npx prisma validate` passes
- [ ] Migration created with descriptive name
- [ ] SQL reviewed before applying

---

## Existing Schema Reference

### Core Models
- `User` / `Account` / `Session` / `VerificationToken` — Auth.js required, DO NOT MODIFY structure
- `Site` — owned by `User`, has many `Page`s
- `Page` — belongs to `Site`, has many `Comment`s
- `Comment` — self-referential replies via `Replies` relation
- `ModerationLog` — audit trail for comment actions

### Existing Indexes
```prisma
// Site
@@index([ownerId])

// Page
@@index([siteId])

// Comment
@@index([pageId, status, createdAt])
@@index([parentId])
@@index([authorEmail])
@@index([status, createdAt])

// ModerationLog
@@index([commentId, createdAt])
@@index([adminEmail, createdAt])
```

### Existing Uniques
```prisma
// User
email @unique

// Account
@@unique([provider, providerAccountId])

// Session
sessionToken @unique

// VerificationToken
token @unique
@@unique([identifier, token])

// Site
domain @unique
siteKey @unique

// Page
@@unique([siteId, slug])
```

---

## Anti-Patterns (NEVER Do These)

1. **Auto-increment integers for IDs** — use CUID
2. **String fields for JSON data** — use `Json` type
3. **Application-level uniqueness** — always use `@unique` or `@@unique`
4. **No indexes on foreign keys** — always index FKs
5. **Missing `onDelete`** — always explicitly define cascade behavior
6. **String for enums** — use Prisma enums for fixed values
7. **Deleting migration files after applying** — never do this
8. **Modifying applied migrations** — create a new migration instead

---

## Verification Commands

```bash
# Validate schema
npx prisma validate

# Check migration status
npx prisma migrate status

# View SQL for a new migration (without applying)
npx prisma migrate dev --create-only --name <name>

# Reset database (dev only!)
npx prisma migrate reset

# Generate client after changes
npx prisma generate

# Open Prisma Studio
npx prisma studio
```
