# Knowledge Base (Human-Facing)

Long-lived context that is **not** obvious from the code, commit history, or `CLAUDE.md`. Append-only log of architecture decisions, gotchas, rejected approaches, and open questions.

Commit messages capture _what_ changed. This file captures _why_ — and the alternatives that were considered and rejected.

---

## How to use this file

- **Append, do not rewrite.** Old entries stay even when the codebase moves on; future readers need to know why something used to be true.
- One entry per decision / gotcha / question. Keep it self-contained — a future reader will not have the surrounding PR context.
- Mark superseded entries with `> **Superseded by [date / entry title]**` at the top of the body instead of deleting them.
- Date every entry (ISO `YYYY-MM-DD`). Author optional.
- Keep entries short. Link out to PRs, issues, or code paths instead of pasting large diffs.
- If the entry only restates `CLAUDE.md` or `.agents/instructions/*`, it does not belong here.

## Entry format

```markdown
### [Type] Short title

**Date:** YYYY-MM-DD
**Tags:** auth, widget, db, perf, security, dx, …

**Context.** What problem / situation prompted this? What was the constraint?

**Decision / Finding.** What we chose, observed, or learned. Be specific — name files, flags, env vars.

**Alternatives considered.** What we did not pick, and why. (Skip for pure gotchas.)

**Consequences.** What this locks us into, what becomes harder, what to watch for.

**Links.** PR / issue / commit / docs.
```

Use one of these `[Type]` prefixes so the file is scannable:

- `[ADR]` — architecture decision (load-bearing, hard to reverse).
- `[Gotcha]` — non-obvious behavior that bit someone; the trap and how to avoid it.
- `[Rejected]` — an approach we explicitly chose **not** to take, with reasoning.
- `[Open]` — known unknown / unresolved question. Resolve by editing in place and re-tagging `[ADR]` or `[Gotcha]`.

---

## Entries

### [ADR] Two separate auth systems (admin vs widget)

**Date:** 2026-05-19
**Tags:** auth, security, architecture

**Context.** Two very different audiences: site owners administering content, and anonymous visitors commenting from third-party origins. Admin needs durable sessions; widget needs cross-origin auth without cookies.

**Decision.** Keep the systems fully separate. Admin uses Auth.js v5 + Google OAuth → server session cookie, gated by `proxy.ts` (Next middleware). Widget uses Google `id_token` → server-issued 7-day Widget JWT (jose), passed as `Authorization: Bearer …` from `sessionStorage`. Secrets are distinct: `AUTH_SECRET` ≠ `WIDGET_JWT_SECRET`.

**Alternatives considered.** Single Auth.js session for both — rejected because cookies do not work cleanly cross-origin and CSRF posture for a public widget API is fragile. A custom session table for the widget — rejected as overkill versus a signed short-lived JWT.

**Consequences.** Two code paths to keep in sync (logout, account deletion, rate limits). Do not share helpers between `lib/auth.ts` and `lib/auth-widget.ts`. Widget endpoints rely on CORS allowlist (`Site.allowedOrigins`) instead of CSRF tokens.

**Links.** `lib/auth.ts`, `lib/auth.config.ts`, `lib/auth-widget.ts`, `proxy.ts`, `app/api/widget/auth/route.ts`.

---

### [ADR] Layered request flow: routes → services → db

**Date:** 2026-05-19
**Tags:** architecture, dx

**Context.** Easy to let business logic leak into Next.js route handlers, which makes it impossible to test or reuse outside an HTTP context (cron jobs, scripts, future workers).

**Decision.** Hard rule: `app/api/**` handlers stay ≤25 lines — parse, auth, call a service, respond. All business logic lives in `lib/services/**`, which must not import anything from `next/*`. Only services import `lib/db.ts`. Zod schemas live in `lib/validators/` and are shared by both.

**Consequences.** Adding a feature is a 3-file change (validator, service, route). Worth it — services become trivially callable from `scripts/`, seeds, and future job runners.

**Links.** `CLAUDE.md` (Architecture → Layered request flow), `lib/services/`, `lib/validators/`, `lib/api/`.

---

### [Gotcha] Next middleware is named `proxy.ts`, not `middleware.ts`

**Date:** 2026-05-19
**Tags:** dx, auth

**Context.** Renamed from the convention default. Tools (and humans) grepping for `middleware.ts` will miss the auth gate entirely.

**Finding.** Edge-runtime middleware lives at repo root as `proxy.ts`. It imports `lib/auth.config.ts` (the edge-safe subset, no Prisma adapter). Matcher: `/dashboard/:path*`.

**Consequences.** When adding admin-only routes, ensure the matcher covers them. Do not import `lib/auth.ts` (full config) from here — it pulls Prisma and breaks the edge bundle.

**Links.** `proxy.ts`, `lib/auth.config.ts`.

---

### [Gotcha] Widget cannot read `process.env`

**Date:** 2026-05-19
**Tags:** widget, build

**Finding.** Widget source is bundled by esbuild via `widget/build.ts`, which `define`s compile-time constants: `__APP_URL__`, `__GOOGLE_CLIENT_ID__`, `__STYLES__`. Reading `process.env.*` inside `widget/src/**` will not work in the browser bundle. Add new env values by extending the `define` map in `widget/build.ts` and declaring the global in `widget/src/types.ts`.

**Links.** `widget/build.ts`, `widget/src/types.ts`.

---

### [ADR] Soft delete only for domain rows

**Date:** 2026-05-19
**Tags:** db, data-model

**Context.** Comments may be moderated, spam-flagged, or removed by the author. Hard-deleting breaks reply threads (self-referential FK) and audit trails (`ModerationLog`).

**Decision.** `Comment.status` enum: `PENDING | APPROVED | SPAM | DELETED`. No physical deletes from domain tables. `onDelete: Cascade` is allowed only for clearly child rows (e.g. Auth.js `Account`/`Session`).

**Consequences.** All read paths must filter by status. Index every `(status, createdAt)` access pattern — composite-index column order must match query order.

**Links.** `prisma/schema.prisma`, `.agents/instructions/database-schema-and-migrations.md`.

---

### [Gotcha] Rate limiter is in-memory LRU

**Date:** 2026-05-19
**Tags:** widget, scaling, security

**Finding.** `lib/rate-limit.ts` uses an in-memory LRU (10 req/min). Per-process state — no protection in a multi-instance deploy. Acceptable for single-node beta; revisit before any horizontal scaling.

**Links.** `lib/rate-limit.ts`.

---

### [Open] No automated tests

**Date:** 2026-05-19
**Tags:** dx, testing

**Question.** Beta has no test runner configured. Before declaring 1.0, decide: Vitest for unit + Playwright for widget e2e? Service layer is the obvious unit-test target (framework-agnostic by design).

---

<!-- New entries go ABOVE this line, newest first. -->
