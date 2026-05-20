# Changelog

All notable changes to OpenRemark are documented here.

## [0.1.0-beta.1] — 2026-05-19

Initial public beta release.

### Features

- Self-hostable comment system for static websites (Astro, Hugo, Next.js, plain HTML)
- Google OAuth sign-in for commenters
- Threaded replies
- Spam / moderation dashboard
- Shadow DOM widget — zero style conflicts with host page
- Per-site origin allowlisting
- Widget JWT auth (separate from admin auth)
- PostgreSQL backend via Prisma ORM

### Known limitations

- Only Google OAuth supported at this time
- Schema may change between beta versions without a migration path
- No email notification system yet
