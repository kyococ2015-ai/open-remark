import { PrismaClient } from "../../generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { config } from "dotenv"

config()

const dbUrl = process.env.DATABASE_URL

if (!dbUrl) {
  console.error("❌ DATABASE_URL not set!")
  console.error("   Benchmarks require DATABASE_URL to be set.")
  process.exit(1)
}

const adapter = new PrismaPg({ connectionString: dbUrl })
const prisma = new PrismaClient({ adapter })

// ── helpers ────────────────────────────────────────────────────────────────

interface BenchmarkResult {
  name: string
  indexExpected: string
  execMs: number
  scanType: string
  rows: number
}

function extractPlanMeta(planLines: string[]) {
  const text = planLines.join(" ")
  const execMatch = text.match(/Execution Time:\s*([\d.]+)\s*ms/)
  const scanMatch = text.match(/(Seq Scan|Index Scan)/)
  const rowsMatch = text.match(/rows=(\d+)/)
  return {
    execMs: execMatch ? parseFloat(execMatch[1]) : 0,
    scanType: scanMatch ? scanMatch[1] : "Unknown",
    rows: rowsMatch ? parseInt(rowsMatch[1]) : 0,
  }
}

function scanIcon(type: string) {
  return type.includes("Index") ? "✅ Index" : type.includes("Seq") ? "⚠️  Seq" : "❓ " + type
}

function pad(s: string | number, n: number) {
  return String(s).padEnd(n).slice(0, n)
}

// ── main ───────────────────────────────────────────────────────────────────

async function benchmark() {
  console.log("\n🔍  Index Benchmark  —  50k comments\n")

  // 1. Data volume
  const counts = await prisma.$queryRaw<[{ table_name: string; row_count: bigint }]>`
    SELECT 'Sites' as table_name, COUNT(*) as row_count FROM "Site"
    UNION ALL SELECT 'Pages', COUNT(*) FROM "Page"
    UNION ALL SELECT 'Comments', COUNT(*) FROM "Comment"
    UNION ALL SELECT 'ModerationLogs', COUNT(*) FROM "ModerationLog"
  `

  console.log("  📊  Data volume:")
  for (const c of counts) {
    console.log(`     ${pad(c.table_name, 16)} ${c.row_count.toLocaleString()}`)
  }
  console.log()

  // 2. Run benchmarks
  const results: BenchmarkResult[] = []

  // ── B1: Comment Feed ──
  const pageId = (await prisma.page.findFirst({ select: { id: true } }))?.id
  if (pageId) {
    const plan = await prisma.$queryRaw<{ "QUERY PLAN": string }[]>`
      EXPLAIN (ANALYZE, FORMAT TEXT)
      SELECT * FROM "Comment"
      WHERE "pageId" = ${pageId} AND status = 'APPROVED'
      ORDER BY "createdAt" DESC LIMIT 50
    `
    const meta = extractPlanMeta(plan.map((p) => p["QUERY PLAN"]))
    results.push({ name: "Comment Feed", indexExpected: "pageId+status", ...meta })
  }

  // ── B2: Replies ──
  const parent = await prisma.comment.findFirst({
    where: { parentId: { not: null } },
    select: { parentId: true },
  })
  if (parent?.parentId) {
    const plan = await prisma.$queryRaw<{ "QUERY PLAN": string }[]>`
      EXPLAIN (ANALYZE, FORMAT TEXT)
      SELECT * FROM "Comment"
      WHERE "parentId" = ${parent.parentId}
      ORDER BY "createdAt" ASC
    `
    const meta = extractPlanMeta(plan.map((p) => p["QUERY PLAN"]))
    results.push({ name: "Reply Loading", indexExpected: "parentId", ...meta })
  }

  // ── B3: Moderation Queue ──
  {
    const plan = await prisma.$queryRaw<{ "QUERY PLAN": string }[]>`
      EXPLAIN (ANALYZE, FORMAT TEXT)
      SELECT * FROM "Comment"
      WHERE status = 'PENDING'
      ORDER BY "createdAt" DESC LIMIT 100
    `
    const meta = extractPlanMeta(plan.map((p) => p["QUERY PLAN"]))
    results.push({ name: "Moderation Queue", indexExpected: "status+createdAt", ...meta })
  }

  // ── B4: Admin Activity ──
  const adminEmail = (
    await prisma.moderationLog.findFirst({ select: { adminEmail: true } })
  )?.adminEmail
  if (adminEmail) {
    const plan = await prisma.$queryRaw<{ "QUERY PLAN": string }[]>`
      EXPLAIN (ANALYZE, FORMAT TEXT)
      SELECT * FROM "ModerationLog"
      WHERE "adminEmail" = ${adminEmail}
      ORDER BY "createdAt" DESC LIMIT 50
    `
    const meta = extractPlanMeta(plan.map((p) => p["QUERY PLAN"]))
    results.push({ name: "Admin Activity", indexExpected: "adminEmail+createdAt", ...meta })
  }

  // ── B5: Pages per Site ──
  const siteId = (await prisma.site.findFirst({ select: { id: true } }))?.id
  if (siteId) {
    const plan = await prisma.$queryRaw<{ "QUERY PLAN": string }[]>`
      EXPLAIN (ANALYZE, FORMAT TEXT)
      SELECT * FROM "Page"
      WHERE "siteId" = ${siteId}
      ORDER BY "createdAt" DESC
    `
    const meta = extractPlanMeta(plan.map((p) => p["QUERY PLAN"]))
    results.push({ name: "Site Dashboard", indexExpected: "siteId", ...meta })
  }

  // ── B6: User's Sites ──
  const ownerId = (await prisma.site.findFirst({ select: { ownerId: true } }))?.ownerId
  if (ownerId) {
    const plan = await prisma.$queryRaw<{ "QUERY PLAN": string }[]>`
      EXPLAIN (ANALYZE, FORMAT TEXT)
      SELECT * FROM "Site"
      WHERE "ownerId" = ${ownerId}
      ORDER BY "createdAt" DESC
    `
    const meta = extractPlanMeta(plan.map((p) => p["QUERY PLAN"]))
    results.push({ name: "User Sites", indexExpected: "ownerId", ...meta })
  }

  // 3. Print results table
  console.log("  ┌─────────────────────┬──────────┬────────────┬───────┐")
  console.log("  │ Query               │ Time     │ Scan       │ Rows  │")
  console.log("  ├─────────────────────┼──────────┼────────────┼───────┤")
  for (const r of results) {
    const time = r.execMs < 1 ? "<1ms" : `${r.execMs.toFixed(1)}ms`
    const icon = r.scanType.includes("Index") ? "✅" : r.scanType.includes("Seq") ? "⚠️ " : "❓"
    console.log(
      `  │ ${pad(r.name, 19)} ${pad(time, 8)} ${pad(icon + " " + r.scanType.split(" ")[0], 10)} ${pad(r.rows, 5)} │`
    )
  }
  console.log("  └─────────────────────┴──────────┴────────────┴───────┘\n")

  // 4. Quick verdict
  const allIndexed = results.every((r) => r.scanType.includes("Index"))
  const avgTime = results.reduce((a, r) => a + r.execMs, 0) / results.length

  if (allIndexed && avgTime < 5) {
    console.log("  🎉  All indexes active. Avg query time: " + avgTime.toFixed(2) + "ms")
  } else if (!allIndexed) {
    console.log("  ⚠️   Some queries are doing full table scans. Check indexes above.")
  } else {
    console.log("  ⚠️   Queries are slower than expected. Consider optimizing.")
  }

  // 5. Index checklist (concise)
  const indexes = await prisma.$queryRaw<{ tablename: string; indexname: string }[]>`
    SELECT tablename, indexname
    FROM pg_indexes
    WHERE tablename IN ('Site','Page','Comment','ModerationLog')
    AND indexname NOT LIKE '%pkey%'
    AND indexname NOT LIKE '%key%'
    ORDER BY tablename, indexname
  `

  console.log("\n  📋  Custom indexes found:")
  for (const idx of indexes) {
    console.log(`     ${pad(idx.tablename, 16)} ${idx.indexname}`)
  }

  console.log("\n✅  Benchmark complete\n")
}

benchmark()
  .catch((e) => {
    console.error("❌ Benchmark failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
