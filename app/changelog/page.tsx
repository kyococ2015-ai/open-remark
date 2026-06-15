import type { Metadata } from "next"
import Link from "next/link"
import { Logo } from "@/components/logo"
import { getListPage } from "@/lib/content"

export const metadata: Metadata = {
  title: "Changelog — OpenRemark",
  description: "What's new in OpenRemark. Notes from each release.",
}

type ChangelogEntry = {
  version: string
  date: string
  changes: string[]
}

export default function ChangelogPage() {
  const { frontmatter } = getListPage("changelog.md")
  const { title, subtitle, entries } = frontmatter as {
    title: string
    subtitle: string
    entries: ChangelogEntry[]
  }

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
        <h1 className="mb-2 text-step-3 font-bold tracking-tight text-balance">
          {title}
        </h1>
        <p className="mb-12 text-step--1 text-muted-foreground">{subtitle}</p>

        <div className="space-y-12">
          {entries.map((entry) => (
            <section key={entry.version}>
              <div className="mb-4 flex items-baseline gap-3">
                <h2 className="text-step-2 font-semibold">v{entry.version}</h2>
                <span className="text-step--1 text-muted-foreground">
                  {entry.date}
                </span>
              </div>
              <ul className="list-disc space-y-2 pl-5 text-step-0 leading-relaxed text-muted-foreground">
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
