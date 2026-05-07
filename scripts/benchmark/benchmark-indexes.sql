-- ============================================================================
-- INDEX BENCHMARK SCRIPT
-- ============================================================================
-- Purpose: Test query performance before/after adding indexes
-- Usage:   psql $DATABASE_URL -f scripts/benchmark/benchmark-indexes.sql
--          OR run via Prisma Studio SQL tab
-- ============================================================================

-- Set timing on to see execution time
\timing on

-- ============================================================================
-- 1. SEED TEST DATA (Run this section first if tables are empty)
-- ============================================================================

-- This script assumes you already have some data.
-- For best results, aim for at least 10,000+ comments.

-- Quick data volume check:
SELECT 
  'Sites' as table_name, COUNT(*) as row_count FROM "Site"
UNION ALL
SELECT 'Pages', COUNT(*) FROM "Page"
UNION ALL
SELECT 'Comments', COUNT(*) FROM "Comment"
UNION ALL
SELECT 'ModerationLogs', COUNT(*) FROM "ModerationLog";

-- ============================================================================
-- 2. BENCHMARK: Comment Feed Query (MOST IMPORTANT)
-- ============================================================================
-- Query: "Show all approved comments for a page, newest first"

SELECT '=== BENCHMARK 1: Comment Feed Query ===' as test;

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM "Comment"
WHERE "pageId" = (
  SELECT id FROM "Page" LIMIT 1
)
AND status = 'APPROVED'
ORDER BY "createdAt" DESC
LIMIT 50;

-- ============================================================================
-- 3. BENCHMARK: Reply Loading
-- ============================================================================
-- Query: "Load all replies for a parent comment"

SELECT '=== BENCHMARK 2: Reply Loading ===' as test;

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM "Comment"
WHERE "parentId" = (
  SELECT id FROM "Comment" WHERE "parentId" IS NOT NULL LIMIT 1
)
ORDER BY "createdAt" ASC;

-- ============================================================================
-- 4. BENCHMARK: Moderation Queue
-- ============================================================================
-- Query: "Show pending comments ordered by date"

SELECT '=== BENCHMARK 3: Moderation Queue ===' as test;

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM "Comment"
WHERE status = 'PENDING'
ORDER BY "createdAt" DESC
LIMIT 100;

-- ============================================================================
-- 5. BENCHMARK: Admin Activity Log
-- ============================================================================
-- Query: "Show moderation actions by admin"

SELECT '=== BENCHMARK 4: Admin Activity Log ===' as test;

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM "ModerationLog"
WHERE "adminEmail" = (
  SELECT "adminEmail" FROM "ModerationLog" LIMIT 1
)
ORDER BY "createdAt" DESC
LIMIT 50;

-- ============================================================================
-- 6. BENCHMARK: Site Dashboard (Pages per Site)
-- ============================================================================

SELECT '=== BENCHMARK 5: Site Dashboard ===' as test;

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM "Page"
WHERE "siteId" = (
  SELECT id FROM "Site" LIMIT 1
)
ORDER BY "createdAt" DESC;

-- ============================================================================
-- 7. BENCHMARK: User's Sites List
-- ============================================================================

SELECT '=== BENCHMARK 6: User Sites List ===' as test;

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM "Site"
WHERE "ownerId" = (
  SELECT "ownerId" FROM "Site" LIMIT 1
)
ORDER BY "createdAt" DESC;

-- ============================================================================
-- 8. INDEX VERIFICATION
-- ============================================================================
-- Check which indexes exist on each table

SELECT '=== INDEX VERIFICATION ===' as test;

SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('Site', 'Page', 'Comment', 'ModerationLog')
ORDER BY tablename, indexname;

-- ============================================================================
-- 9. INDEX USAGE STATS (After running some queries)
-- ============================================================================
-- This shows how many times each index has been used

SELECT '=== INDEX USAGE STATS ===' as test;

SELECT 
  schemaname,
  relname as table_name,
  indexrelname as index_name,
  idx_scan as times_used,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE relname IN ('Site', 'Page', 'Comment', 'ModerationLog')
ORDER BY relname, indexrelname;

-- ============================================================================
-- HOW TO READ EXPLAIN ANALYZE OUTPUT
-- ============================================================================
-- Look for these indicators:
--
-- ❌ WITHOUT INDEX (Sequential Scan - SLOW):
--   -> Seq Scan on "Comment"  (cost=0.00..204.00 rows=50 width=200)
--         Filter: (status = 'APPROVED'::"CommentStatus")
--   Execution Time: 150.234 ms
--
-- ✅ WITH INDEX (Index Scan - FAST):
--   -> Index Scan using "Comment_pageId_status_createdAt_idx" on "Comment"
--         Index Cond: (("pageId" = 'xxx') AND (status = 'APPROVED'::"CommentStatus"))
--   Execution Time: 0.452 ms
--
-- Key metrics:
-- - Execution Time: Lower is better
-- - Shared Hit Blocks: Data from RAM (fast) vs Shared Read Blocks: Data from disk (slow)
-- - Rows Removed by Filter: High number = bad, needs index
-- ============================================================================
