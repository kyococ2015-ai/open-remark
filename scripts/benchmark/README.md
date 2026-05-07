# Database Index Benchmark

This directory contains scripts to benchmark the performance of your database indexes.

## Quick Start

### 1. Seed Test Data

```bash
# Populate database with 50,000 comments
npx tsx scripts/benchmark/seed-benchmark-data.ts
```

**Configuration:** Edit `TARGET_COMMENTS` in the script to adjust data volume:
- `10_000` — Quick test (~10 seconds)
- `50_000` — Good benchmark (~1 minute)
- `100_000` — Thorough test (~2-3 minutes)

### 2. Run Benchmark Queries

```bash
# Via psql (recommended)
psql $DATABASE_URL -f scripts/benchmark/benchmark-indexes.sql

# Or via Prisma (if you don't have psql)
npx prisma db execute --file scripts/benchmark/benchmark-indexes.sql
```

## What It Measures

| Query | Simulates | Index Used |
|-------|-----------|------------|
| Comment Feed | Loading comments on a page | `@@index([pageId, status, createdAt])` |
| Reply Loading | Threaded comment replies | `@@index([parentId])` |
| Moderation Queue | Admin pending review | `@@index([status, createdAt])` |
| Admin Activity | Audit trail per admin | `@@index([adminEmail, createdAt])` |
| Site Dashboard | Pages per site | `@@index([siteId])` |
| User Sites | Owner's site list | `@@index([ownerId])` |

## Reading the Results

Look for **Index Scan** vs **Seq Scan** in the output:

```
✅ GOOD (Using Index):
  -> Index Scan using "Comment_pageId_status_createdAt_idx"
  Execution Time: 0.234 ms

❌ BAD (Full Table Scan):
  -> Seq Scan on "Comment"
  Execution Time: 145.678 ms
```

## Before vs After Comparison

To see the impact of indexes, you can temporarily disable them:

```sql
-- Disable index (for testing only!)
DROP INDEX "Comment_pageId_status_createdAt_idx";

-- Run benchmark query
EXPLAIN (ANALYZE) SELECT * FROM "Comment" WHERE "pageId" = '...' AND status = 'APPROVED';

-- Re-create index
CREATE INDEX "Comment_pageId_status_createdAt_idx" ON "Comment" ("pageId", status, "createdAt" DESC);
```

## Expected Results

With 50,000 comments:

| Query | No Index | With Index | Improvement |
|-------|----------|------------|-------------|
| Comment Feed | 50-200ms | 0.5-2ms | **100x faster** |
| Replies | 30-100ms | 0.3-1ms | **100x faster** |
| Moderation Queue | 40-150ms | 1-5ms | **50x faster** |

## Troubleshooting

**"No data found" errors:**
Run the seed script first: `npx tsx scripts/benchmark/seed-benchmark-data.ts`

**"relation does not exist" errors:**
Make sure migrations are applied: `npx prisma migrate deploy`

**Slow seeding:**
Reduce `TARGET_COMMENTS` to 10,000 for faster results.
