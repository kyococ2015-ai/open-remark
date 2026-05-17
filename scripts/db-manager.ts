#!/usr/bin/env tsx
/**
 * DATABASE MANAGER
 * =================
 * Helper script for common database operations.
 *
 * Usage:
 *   npx tsx scripts/db-manager.ts [command]
 *
 * Commands:
 *   status     - Check migration status
 *   reset      - Reset database (DANGEROUS: destroys all data)
 *   validate   - Validate Prisma schema
 *
 * Environment:
 *   DATABASE_URL  - PostgreSQL connection string
 */

import { execSync } from "child_process"
import { config } from "dotenv"

// Load .env file
config()

const DB_URL = process.env.DATABASE_URL

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

  console.log(`Database: ${getDbName(DB_URL)}\n`)

  if (!DB_URL) {
    console.error("❌ DATABASE_URL not set in .env")
    process.exit(1)
  }

  try {
    run("npx prisma migrate status")
  } catch {
    console.log("   Could not connect or no migrations\n")
  }
}

async function reset() {
  banner("RESET DATABASE")

  if (!DB_URL) {
    console.error("❌ DATABASE_URL not set")
    process.exit(1)
  }

  console.log(`Target DB: ${getDbName(DB_URL)}`)
  console.log("\n⚠️  ⚠️  ⚠️  DANGER ZONE  ⚠️  ⚠️  ⚠️")
  console.log("   This will DESTROY ALL DATA in the database.\n")

  const readline = await import("readline")
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const answer = await new Promise<string>((resolve) => {
    rl.question('Type "destroy all data" to confirm: ', resolve)
  })
  rl.close()

  if (answer !== "destroy all data") {
    console.log("\n❌ Aborted. Confirmation phrase did not match.")
    process.exit(0)
  }

  console.log("\n💥 Resetting database...")
  try {
    run("npx prisma migrate reset --force")
    console.log("✅ Database reset complete")
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
  } catch {
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
  case "reset":
    reset()
    break
  case "validate":
    validate()
    break
  default:
    console.log(`
Database Manager
================

Commands:
  status     Check migration status
  reset      Reset database (destructive)
  validate   Validate Prisma schema

Examples:
  npx tsx scripts/db-manager.ts status
  npx tsx scripts/db-manager.ts reset
  npx tsx scripts/db-manager.ts validate
`)
    process.exit(1)
}
