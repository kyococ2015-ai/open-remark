import type { Metadata } from "next"
import Link from "next/link"
import { Logo } from "@/components/logo"

export const metadata: Metadata = {
  title: "Changelog — OpenRemark",
  description: "What's new in OpenRemark. Notes from each release.",
}

type ChangelogEntry = {
  version: string
  date: string
  changes: string[]
}

const entries: ChangelogEntry[] = [
  {
    version: "0.3.3",
    date: "June 8, 2026",
    changes: [
      "Terms of Service page",
      "ProductHunt badge on the homepage",
      "Replies in a thread now come back oldest-first",
      "Sidebar refreshes when you switch sites",
      "New demo page and banner video",
      "Fixed the per-user email notification switch staying clickable when the site-level setting was off",
    ],
  },
  {
    version: "0.3.2",
    date: "June 8, 2026",
    changes: [
      "Moved site settings into one section per concern (general, snippet, appearance, transfer, email, danger zone). The single form was getting hard to live in.",
      "Vercel redirects + rewrites for the new domain",
      "Sign-in rewrite handled in the app, not at the edge",
      "Updated email templates",
      "New favicon, new GTM id",
    ],
  },
  {
    version: "0.3.1",
    date: "June 7, 2026",
    changes: [
      "/elements — a private design preview with tokens, components, controls, charts, and a sidebar mockup. Useful when iterating on the dashboard.",
      "Logo is now driven by config.site, so self-hosters can swap it without touching code",
      "Landing-page metadata (title, description, OG, favicon) reads from config.metadata",
      "Reorganized the dashboard sidebar and restored a few missing design tokens",
      "Tidied up the Email Notification settings card",
    ],
  },
  {
    version: "0.3.0",
    date: "June 7, 2026",
    changes: [
      "@mention autocomplete in the widget, with a profile tooltip on hover",
      "Like notifications, a re-subscribe flow, and dedup for nested replies",
      'Stopped sending repeat "you got a like" emails by tracking what was already notified',
      "data-slug is optional now — the widget reads the slug from the page URL",
      "Page cells in the comments table link straight to the live anchor on your site",
      "Filter input on the pages panel, plus some hover-state cleanup",
      'Fixed the SMTP "from" fallback',
    ],
  },
  {
    version: "0.2.0",
    date: "June 4, 2026",
    changes: [
      "Email notifications for new comments and replies, with React Email templates",
      "SMTP credentials are per-site and live in the dashboard. You have to configure them before you can turn notifications on.",
      "One-click unsubscribe links, plus an admin toggle per commenter in the users table",
      "Clicking through from an email scrolls to the comment and highlights it",
      "Reworked email error handling and tightened the self-reply guard",
      "SMTP password field has a visibility toggle",
    ],
  },
  {
    version: "0.1.0-beta.2",
    date: "June 3, 2026",
    changes: [
      "Transfer a site to another owner from the settings page",
      "Authors can see their own pending comments in the widget while they wait for moderation",
      "Widget rewrite under the hood — targeted re-renders instead of nuking the list",
    ],
  },
  {
    version: "0.1.0-beta.1",
    date: "May 19, 2026",
    changes: ["First public beta."],
  },
]

export default function ChangelogPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4">
          <Link href="/" className="flex items-center font-semibold">
            <Logo />
          </Link>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto w-full max-w-3xl flex-1 px-4 py-16"
      >
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-balance">
          Changelog
        </h1>
        <p className="mb-12 text-sm text-muted-foreground">
          Notes from each release. Newest first.
        </p>

        <div className="space-y-12">
          {entries.map((entry) => (
            <section key={entry.version}>
              <div className="mb-4 flex items-baseline gap-3">
                <h2 className="text-2xl font-semibold">v{entry.version}</h2>
                <span className="text-sm text-muted-foreground">
                  {entry.date}
                </span>
              </div>
              <ul className="list-disc space-y-2 pl-5 leading-relaxed text-muted-foreground">
                {entry.changes.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>

      <footer className="mt-auto border-t">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-8 text-sm text-muted-foreground">
          <Logo />
          <Link
            href="/"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Back to home
          </Link>
        </div>
      </footer>
    </div>
  )
}
