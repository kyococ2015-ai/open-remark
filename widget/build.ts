import { build } from "esbuild"
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"
import { transform } from "lightningcss"

function loadEnvFile(path: string) {
  if (!existsSync(path)) return
  const content = readFileSync(path, "utf8")
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    // Remove surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

// Load .env then .env.local (local overrides)
const envPath = resolve(import.meta.dirname, "../.env")
const envLocalPath = resolve(import.meta.dirname, "../.env.local")
loadEnvFile(envPath)
loadEnvFile(envLocalPath)

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
const googleClientId = process.env.AUTH_GOOGLE_ID ?? ""

const cssPath = resolve(import.meta.dirname, "src/styles.css")
const rawCss = readFileSync(cssPath, "utf8")

const minifiedCss = transform({
  filename: "styles.css",
  code: Buffer.from(rawCss),
  minify: true,
}).code.toString()

const commonOptions = {
  entryPoints: [resolve(import.meta.dirname, "src/index.ts")],
  bundle: true,
  format: "iife" as const,
  target: ["es2020"],
  define: {
    __APP_URL__: JSON.stringify(appUrl),
    __GOOGLE_CLIENT_ID__: JSON.stringify(googleClientId),
  } as Record<string, string>,
  logLevel: "info" as const,
}

// Production / minified build
await build({
  ...commonOptions,
  minify: true,
  outfile: resolve(import.meta.dirname, "../public/embed.js"),
  define: {
    ...commonOptions.define,
    __STYLES__: JSON.stringify(minifiedCss),
  },
})

// Debug / non-minified build
await build({
  ...commonOptions,
  minify: false,
  outfile: resolve(import.meta.dirname, "../public/embed.debug.js"),
  define: {
    ...commonOptions.define,
    __STYLES__: JSON.stringify(rawCss),
  },
})
