#!/usr/bin/env tsx
/**
 * DATABASE MANAGER
 * =================
 * Handles dual-database setup: Production vs Development
 * 
 * Usage:
 *   npx tsx scripts/db-manager.ts [command]
 * 
 * Commands:
 *   status     - Check migration status on both databases
 *   sync       - Apply migrations to both databases (prod first, then dev)
 *   reset-dev  - Reset development database (DANGEROUS: destroys dev data only)
 *   validate   - Validate schema
 * 
 * Environment:
 *   DATABASE_URL              - Production database (immutable)
 *   DATABASE_URL_DEVELOPMENT  - Development database (safe for experiments)
 */

import { execSync } from "child_process"
import { config } from "dotenv"

// Load .env file
config()

const DB_PROD = process.env.DATABASE_URL
const DB_DEV = process.env.DATABASE_URL_DEVELOPMENT

function run(cmd: string, env: Record<string, string> = {}) {
  const fullEnv = { ...process.env, ...env }
  return execSync(cmd, { env: fullEnv, stdio: "inherit" })
}

function getDbName(url: string | undefined): string {
  if (!url) return "NOT SET"
  try {
    const match = url.match(/\/([^/?]+)\?/)
    return match ? match[1] : "unknown"
  } catch {
    return "invalid-url"
  }
}

function banner(title: string) {
  console.log("\n" + "=".repeat(50))
  console.log(`  ${title}`)
  console.log("=".repeat(50) + "\n")
}

async function status() {
  banner("DATABASE STATUS")

  console.log(`Production DB:    ${getDbName(DB_PROD)}`)
  console.log(`Development DB:   ${getDbName(DB_DEV)}\n`)

  if (!DB_PROD || !DB_DEV) {
    console.error("❌ Missing database URLs in .env")
    console.error("   Required: DATABASE_URL and DATABASE_URL_DEVELOPMENT")
    process.exit(1)
  }

  console.log("📊 Production Database:")
  try {
    run("npx prisma migrate status", { DATABASE_URL: DB_PROD })
  } catch (e) {
    console.log("   Could not connect or no migrations\n")
  }

  console.log("\n📊 Development Database:")
  try {
    run("npx prisma migrate status", { DATABASE_URL: DB_DEV })
  } catch (e) {
    console.log("   Could not connect or no migrations\n")
  }
}

async function sync() {
  banner("SYNC DATABASES")

  if (!DB_PROD || !DB_DEV) {
    console.error("❌ Missing database URLs in .env")
    process.exit(1)
  }

  console.log(`Production DB:    ${getDbName(DB_PROD)}`)
  console.log(`Development DB:   ${getDbName(DB_DEV)}\n`)

  console.log("⚠️  This will apply pending migrations to BOTH databases.")
  console.log("   Production will use 'migrate deploy' (safe)")
  console.log("   Development will use 'migrate dev' (allows drift)\n")

  const readline = await import("readline")
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const answer = await new Promise<string>((resolve) => {
    rl.question("Proceed? (yes/no): ", resolve)
  })
  rl.close()

  if (answer.toLowerCase() !== "yes") {
    console.log("\n❌ Aborted.")
    process.exit(0)
  }

  // Sync Production (safe, no prompts)
  console.log("\n🔄 Syncing PRODUCTION database...")
  try {
    run("npx prisma migrate deploy", { DATABASE_URL: DB_PROD })
    console.log("✅ Production synced\n")
  } catch (e) {
    console.error("❌ Production sync failed:", e)
    process.exit(1)
  }

  // Sync Development
  console.log("🔄 Syncing DEVELOPMENT database...")
  try {
    run("npx prisma migrate deploy", { DATABASE_URL: DB_DEV })
    console.log("✅ Development synced\n")
  } catch (e) {
    console.error("❌ Development sync failed:", e)
    process.exit(1)
  }

  console.log("🎉 Both databases are now in sync!")
}

async function resetDev() {
  banner("RESET DEVELOPMENT DATABASE")

  if (!DB_DEV) {
    console.error("❌ DATABASE_URL_DEVELOPMENT not set")
    process.exit(1)
  }

  console.log(`Target DB: ${getDbName(DB_DEV)}`)
  console.log("\n⚠️  ⚠️  ⚠️  DANGER ZONE  ⚠️  ⚠️  ⚠️")
  console.log("   This will DESTROY ALL DATA in the development database.")
  console.log("   Production database will NOT be affected.\n")

  const readline = await import("readline")
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const answer = await new Promise<string>((resolve) => {
    rl.question('Type "destroy dev data" to confirm: ', resolve)
  })
  rl.close()

  if (answer !== "destroy dev data") {
    console.log("\n❌ Aborted. Confirmation phrase did not match.")
    process.exit(0)
  }

  console.log("\n💥 Resetting development database...")
  try {
    run("npx prisma migrate reset --force", { DATABASE_URL: DB_DEV })
    console.log("✅ Development database reset complete")
  } catch (e) {
    console.error("❌ Reset failed:", e)
    process.exit(1)
  }
}

async function validate() {
  banner("VALIDATE SCHEMA")
  try {
    run("npx prisma validate")
    console.log("✅ Schema is valid")
  } catch (e) {
    console.error("❌ Schema validation failed")
    process.exit(1)
  }
}

// Main
const command = process.argv[2]

switch (command) {
  case "status":
    status()
    break
  case "sync":
    sync()
    break
  case "reset-dev":
    resetDev()
    break
  case "validate":
    validate()
    break
  default:
    console.log(`
Database Manager
================

Commands:
  status     Check migration status on both databases
  sync       Apply migrations to both databases safely
  reset-dev  Reset development database (destructive)
  validate   Validate Prisma schema

Examples:
  npx tsx scripts/db-manager.ts status
  npx tsx scripts/db-manager.ts sync
  npx tsx scripts/db-manager.ts reset-dev
`)
    process.exit(1)
}
