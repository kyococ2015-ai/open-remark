# Zeon Comments

A self-hostable comment system for static websites — Astro, Hugo, Next.js, and any site that accepts HTML.

**Features:** Google sign-in · threaded replies · spam/moderation dashboard · shadow DOM widget · origin allowlisting

## Quick start

```bash
# 1. Install
yarn install

# 2. Configure
cp .env.example .env
# Fill in AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, AUTH_SECRET, WIDGET_JWT_SECRET

# 3. Database
yarn db:migrate
yarn db:seed        # optional demo data

# 4. Run (also builds widget + generates Prisma client)
yarn dev
```

Open `http://localhost:3000` — sign in with Google to access the dashboard.

## Embed on your site

```html
<!-- Paste anywhere in your post template -->
<div
  data-zeon-comments
  data-site-key="YOUR_SITE_KEY"
  data-slug="/posts/your-post-slug"
></div>
<script async src="https://your-domain.com/embed.js"></script>
```

Get your site key from **Dashboard → Sites → Install**.

## Framework guides

- [Astro](docs/embed-astro.md)
- [Hugo](docs/embed-hugo.md)
- [Next.js](docs/embed-nextjs.md)

## Architecture

See [docs/architecture.md](docs/architecture.md) for system design, request flows, and scaling path.

## Contributing

See [docs/contributing.md](docs/contributing.md).

## Tech stack

| Layer       | Tech                      |
| ----------- | ------------------------- |
| Framework   | Next.js 16 App Router     |
| Database    | PostgreSQL (Prisma)       |
| ORM         | Prisma                    |
| Admin auth  | Auth.js v5 (Google OAuth) |
| Widget auth | Widget JWT (jose)         |
| UI          | shadcn/ui + Tailwind v4   |
| Validation  | Zod                       |
| Widget      | Vanilla TS → esbuild      |

## Environment variables

| Variable              | Description                                                                      |
| --------------------- | -------------------------------------------------------------------------------- |
| `DATABASE_URL`        | PostgreSQL connection string (e.g. `postgresql://user:pass@localhost:5432/zeon`) |
| `AUTH_SECRET`         | Auth.js secret (run `openssl rand -base64 32`)                                   |
| `AUTH_GOOGLE_ID`      | Google OAuth client ID                                                           |
| `AUTH_GOOGLE_SECRET`  | Google OAuth client secret                                                       |
| `WIDGET_JWT_SECRET`   | JWT secret for widget visitor tokens                                             |
| `NEXT_PUBLIC_APP_URL` | Public app URL (used in embed snippets)                                          |

## License

MIT
