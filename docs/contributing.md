# Contributing to Zeon Comments

Thank you for helping improve Zeon Comments.

## Project structure

```
zeon-comments/
├── app/                  Next.js App Router pages + API routes
│   ├── (auth)/           Sign-in page
│   ├── (dashboard)/      Admin dashboard (protected)
│   ├── api/v1/           Admin REST API
│   └── api/widget/       CORS-open widget API
├── components/
│   ├── ui/               shadcn/ui primitives (auto-generated, don't edit)
│   └── dashboard/        Dashboard-specific components
├── lib/
│   ├── services/         Business logic — no Next.js imports here
│   ├── validators/       Zod schemas shared by routes + services
│   └── api/              Error + response helpers
├── prisma/               Schema, migrations, seed
├── widget/               Embed widget source (vanilla TS → esbuild)
│   └── src/
│       ├── index.ts      Entry point, mounts widget instances
│       ├── api.ts        Fetch helpers for the widget API
│       ├── auth.ts       Google popup auth + JWT storage
│       ├── render.ts     Pure DOM render functions
│       └── styles.css    Scoped CSS (injected into shadow DOM)
└── docs/                 Integration guides
```

## Architecture rules

- **Route handlers are thin.** Parse input, auth-check, call a service, return response. Keep under 25 lines.
- **All business logic lives in `lib/services/`.** No Next.js imports in services — they must be unit-testable without a framework.
- **Only services touch Prisma.** Route handlers import from services, never from `lib/db.ts` directly.
- **Validators are shared.** Zod schemas in `lib/validators/` are used by both the API route and the service.

## Local development setup

```bash
# 1. Install dependencies
yarn install

# 2. Copy env file and fill in values
cp .env.example .env
# Add AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET from Google Cloud Console

# 3. Run database migrations
yarn db:migrate

# 4. Seed demo data
yarn db:seed

# 5. Start the dev server (also builds widget + generates Prisma client)
yarn dev
```

Visit `http://localhost:3000`.

## Google OAuth setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → APIs & Services → Credentials
3. Create an OAuth 2.0 Client ID (Web application)
4. Add `http://localhost:3000/api/auth/callback/google` to Authorized redirect URIs
5. Add `http://localhost:3000/api/widget/oauth-callback` to Authorized redirect URIs
6. Copy Client ID + Secret to `.env`

## Database commands

```bash
yarn db:migrate      # Run pending migrations
yarn db:generate     # Regenerate Prisma client after schema changes
yarn db:seed         # Populate demo data
yarn db:studio       # Open Prisma Studio (GUI)
```

## Widget development

The widget lives in `widget/src/` and compiles to `public/embed.js` via esbuild.

```bash
yarn widget:dev    # Build (unminified, fast)
yarn widget:build  # Build (minified, for production)
```

After building, open `http://localhost:3000/demo.html` to see the widget in action.

The widget uses a **shadow DOM** — styles are fully isolated. Edit `widget/src/styles.css` for visual changes.

The `__APP_URL__`, `__GOOGLE_CLIENT_ID__`, and `__STYLES__` constants are injected at build time via esbuild `define`. Do not import these from env in the widget source.

## Adding a new API endpoint

1. Create the route file under `app/api/v1/` or `app/api/widget/`.
2. Add a Zod validator in `lib/validators/` if the route accepts a body.
3. Add business logic to an existing or new service in `lib/services/`.
4. Keep the route handler thin — parse, auth, call service, respond.

## Modifying the database schema

1. Edit `prisma/schema.prisma`.
2. Run `yarn db:migrate --name describe_your_change`.
3. Run `yarn db:generate` to update the Prisma client.
4. Update any affected services.

## Switching to Postgres (production)

1. Change `datasource db { provider = "postgresql" }` in `prisma/schema.prisma`.
2. Update `prisma.config.ts` datasource URL.
3. Replace `PrismaLibSql` in `lib/db.ts` with the appropriate Prisma driver adapter (e.g., `@prisma/adapter-pg`).
4. Run `yarn db:migrate` against the Postgres instance.

## Code style

- TypeScript strict mode — no `any`, no `ts-ignore` without a comment.
- No comments that describe WHAT the code does — only WHY (hidden constraints, non-obvious invariants).
- shadcn/ui for all dashboard UI. Don't import Radix primitives directly.
- Tailwind v4 utility classes only — no custom CSS in component files.

## Pull request checklist

- [ ] `yarn typecheck` passes
- [ ] `yarn lint` passes  
- [ ] `yarn dev` starts without errors
- [ ] New API routes have a corresponding service function
- [ ] New Prisma schema changes have a migration
- [ ] Sensitive data (credentials, personal info) not committed
