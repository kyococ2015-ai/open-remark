import { build } from "esbuild";
import { readFileSync } from "fs";
import { resolve } from "path";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const googleClientId = process.env.AUTH_GOOGLE_ID ?? "";

// Read CSS to inline into the bundle
const css = readFileSync(resolve(import.meta.dirname, "src/styles.css"), "utf8");

await build({
  entryPoints: [resolve(import.meta.dirname, "src/index.ts")],
  bundle: true,
  minify: process.env.NODE_ENV === "production",
  format: "iife",
  target: ["es2020"],
  outfile: resolve(import.meta.dirname, "../public/embed.js"),
  define: {
    __APP_URL__: JSON.stringify(appUrl),
    __GOOGLE_CLIENT_ID__: JSON.stringify(googleClientId),
    __STYLES__: JSON.stringify(css),
  },
  logLevel: "info",
});
