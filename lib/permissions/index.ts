// lib/permissions/index.ts
// Barrel re-export so `@/lib/permissions` remains the single import path.
// Site-level rules live in ./site, platform-level rules in ./platform.

export * from "./site"
export * from "./platform"
