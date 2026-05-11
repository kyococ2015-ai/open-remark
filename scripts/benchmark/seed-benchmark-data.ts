#!/usr/bin/env tsx
/**
 * SEED BENCHMARK DATA
 * ===================
 * Populates the database with realistic test data for benchmarking.
 *
 * Usage: npx tsx scripts/benchmark/seed-benchmark-data.ts
 *
 * Config: Adjust TARGET_COMMENTS below to control data volume.
 */

import { PrismaClient, CommentStatus } from "../../generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { config } from "dotenv"

// Load .env file
config()

const dbUrl = process.env.DATABASE_URL

if (!dbUrl) {
  console.error("❌ DATABASE_URL not set!")
  console.error("   Set DATABASE_URL in your .env file")
  process.exit(1)
}

// Bare minimum guard: block remote/cloud databases unless explicitly forced
function isLocalDatabase(url: string): boolean {
  try {
    const hostname = new URL(url).hostname
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".local")
  } catch {
    return false
  }
}

if (!isLocalDatabase(dbUrl) && !process.env.FORCE_SEED) {
  console.error("❌ SAFETY BLOCK: DATABASE_URL points to a remote database.")
  console.error("   Seeding is only allowed on local databases by default.")
  console.error("   Set FORCE_SEED=1 to override this check.")
  process.exit(1)
}

const adapter = new PrismaPg({ connectionString: dbUrl })
const prisma = new PrismaClient({ adapter })

// ============================================================================
// CONFIGURATION
// ============================================================================
const TARGET_SITES = 10
const TARGET_PAGES_PER_SITE = 20 // 200 pages total
const TARGET_COMMENTS = 50000 // Adjust: 10k = quick, 100k = thorough
const MODERATION_LOG_RATIO = 0.3 // 30% of comments have moderation logs

// ============================================================================
// HELPERS
// ============================================================================
const randomElement = <T>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)]
const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min
const randomDate = (daysBack: number = 365) => {
  const date = new Date()
  date.setDate(date.getDate() - randomInt(0, daysBack))
  return date
}

const loremWords = [
  "lorem",
  "ipsum",
  "dolor",
  "sit",
  "amet",
  "consectetur",
  "adipiscing",
  "elit",
  "sed",
  "do",
  "eiusmod",
  "tempor",
  "incididunt",
  "ut",
  "labore",
  "et",
  "dolore",
  "magna",
  "aliqua",
  "ut",
  "enim",
  "ad",
  "minim",
  "veniam",
  "quis",
  "nostrud",
  "exercitation",
  "ullamco",
  "laboris",
  "nisi",
  "ut",
  "aliquip",
  "ex",
  "ea",
  "commodo",
  "consequat",
  "duis",
  "aute",
  "irure",
  "in",
  "reprehenderit",
  "voluptate",
  "velit",
  "esse",
  "cillum",
  "fugiat",
  "nulla",
  "pariatur",
  "excepteur",
  "sint",
  "occaecat",
  "cupidatat",
  "non",
  "proident",
  "sunt",
  "culpa",
  "qui",
  "officia",
  "deserunt",
  "mollit",
  "anim",
  "id",
  "est",
  "laborum",
]

const generateBody = (minWords = 10, maxWords = 100) => {
  const wordCount = randomInt(minWords, maxWords)
  return Array.from({ length: wordCount }, () =>
    randomElement(loremWords)
  ).join(" ")
}

const names = [
  "Alice",
  "Bob",
  "Charlie",
  "Diana",
  "Eve",
  "Frank",
  "Grace",
  "Henry",
  "Ivy",
  "Jack",
]
const domains = ["example.com", "test.org", "demo.io", "site.net", "app.dev"]

// ============================================================================
// MAIN SEEDING
// ============================================================================
async function seed() {
  console.log("🌱 Starting benchmark data seeding...\n")
  const startTime = Date.now()

  // --------------------------------------------------------------------------
  // 1. Create Users (if needed)
  // --------------------------------------------------------------------------
  console.log("Creating users...")
  const existingUsers = await prisma.user.findMany({ take: 1 })
  let users = existingUsers

  if (users.length === 0) {
    users = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        prisma.user.create({
          data: {
            email: `user${i + 1}@example.com`,
            name: `User ${i + 1}`,
          },
        })
      )
    )
  }
  console.log(`  ✅ ${users.length} users ready\n`)

  // --------------------------------------------------------------------------
  // 2. Create Sites
  // --------------------------------------------------------------------------
  console.log(`Creating ${TARGET_SITES} sites...`)
  const sites = await Promise.all(
    Array.from({ length: TARGET_SITES }, (_, i) =>
      prisma.site.create({
        data: {
          name: `Site ${i + 1}`,
          domain: `${randomElement(domains)}`,
          siteKey: `site-${Date.now()}-${i}`,
          ownerId: randomElement(users).id,
          allowedOrigins: "[]",
        },
      })
    )
  )
  console.log(`  ✅ ${sites.length} sites created\n`)

  // --------------------------------------------------------------------------
  // 3. Create Pages
  // --------------------------------------------------------------------------
  const totalPages = TARGET_SITES * TARGET_PAGES_PER_SITE
  console.log(`Creating ${totalPages} pages...`)
  const pages: { id: string; siteId: string }[] = []

  for (const site of sites) {
    const sitePages = await Promise.all(
      Array.from({ length: TARGET_PAGES_PER_SITE }, (_, i) =>
        prisma.page.create({
          data: {
            slug: `page-${i + 1}-${Math.random().toString(36).substring(7)}`,
            siteId: site.id,
          },
        })
      )
    )
    pages.push(...sitePages)
  }
  console.log(`  ✅ ${pages.length} pages created\n`)

  // --------------------------------------------------------------------------
  // 4. Create Commenters
  // --------------------------------------------------------------------------
  console.log("Creating commenters...")
  const commenters = await Promise.all(
    names.map((name, i) =>
      prisma.commenter.upsert({
        where: { email: `${name.toLowerCase()}@example.com` },
        update: {},
        create: {
          name,
          email: `${name.toLowerCase()}@example.com`,
          username: name.toLowerCase() + (i + 1),
        },
      })
    )
  )
  console.log(`  ✅ ${commenters.length} commenters created\n`)

  // --------------------------------------------------------------------------
  // 5. Create Comments (in batches for performance)
  // --------------------------------------------------------------------------
  console.log(`Creating ${TARGET_COMMENTS} comments...`)
  console.log("  This may take a minute...\n")

  const BATCH_SIZE = 1000
  const statuses = [
    CommentStatus.APPROVED,
    CommentStatus.PENDING,
    CommentStatus.SPAM,
    CommentStatus.DELETED,
  ]
  let createdComments = 0
  const commentIds: string[] = []

  for (
    let batch = 0;
    batch < Math.ceil(TARGET_COMMENTS / BATCH_SIZE);
    batch++
  ) {
    const batchSize = Math.min(BATCH_SIZE, TARGET_COMMENTS - batch * BATCH_SIZE)

    const batchData = Array.from({ length: batchSize }, () => {
      const page = randomElement(pages)
      const hasParent = Math.random() < 0.3 // 30% are replies
      const commenter = randomElement(commenters)

      return {
        body: generateBody(5, 80),
        commenterId: commenter.id,
        status: randomElement(statuses),
        pageId: page.id,
        parentId:
          hasParent && commentIds.length > 0 ? randomElement(commentIds) : null,
        createdAt: randomDate(),
      }
    })

    const result = await prisma.comment.createMany({
      data: batchData,
      skipDuplicates: false,
    })

    // Fetch the IDs we just created (for parent references)
    const latestComments = await prisma.comment.findMany({
      take: batchSize,
      orderBy: { createdAt: "desc" },
      select: { id: true },
    })
    commentIds.push(...latestComments.map((c) => c.id))

    createdComments += result.count
    if (batch % 10 === 0) {
      console.log(
        `  📦 Batch ${batch + 1}: ${createdComments} comments created`
      )
    }
  }
  console.log(`  ✅ ${createdComments} comments created\n`)

  // --------------------------------------------------------------------------
  // 5. Create Moderation Logs
  // --------------------------------------------------------------------------
  const logCount = Math.floor(createdComments * MODERATION_LOG_RATIO)
  console.log(`Creating ${logCount} moderation logs...`)

  const allCommentIds = (
    await prisma.comment.findMany({ select: { id: true } })
  ).map((c) => c.id)
  const actions = ["APPROVE", "REJECT", "DELETE", "MARK_SPAM"]
  const adminEmails = [
    "admin@example.com",
    "moderator@test.org",
    "owner@demo.io",
  ]

  const logBatches = Math.ceil(logCount / BATCH_SIZE)
  let createdLogs = 0

  for (let batch = 0; batch < logBatches; batch++) {
    const batchSize = Math.min(BATCH_SIZE, logCount - batch * BATCH_SIZE)

    const batchData = Array.from({ length: batchSize }, () => ({
      action: randomElement(actions),
      adminEmail: randomElement(adminEmails),
      commentId: randomElement(allCommentIds),
      createdAt: randomDate(30), // More recent
    }))

    const result = await prisma.moderationLog.createMany({
      data: batchData,
    })
    createdLogs += result.count
  }
  console.log(`  ✅ ${createdLogs} moderation logs created\n`)

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  const duration = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log("═══════════════════════════════════════════")
  console.log("🎉 SEEDING COMPLETE")
  console.log("═══════════════════════════════════════════")
  console.log(`  Sites:          ${sites.length}`)
  console.log(`  Pages:          ${pages.length}`)
  console.log(`  Comments:       ${createdComments}`)
  console.log(`  Moderation Logs:${createdLogs}`)
  console.log(`  Total Time:     ${duration}s`)
  console.log("═══════════════════════════════════════════\n")

  console.log("Next steps:")
  console.log(
    "  1. Run benchmark:  psql $DATABASE_URL -f scripts/benchmark-indexes.sql"
  )
  console.log("  2. Or use:         npx prisma studio → SQL tab\n")
}

seed()
  .catch((e) => {
    console.error("❌ Seeding failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
