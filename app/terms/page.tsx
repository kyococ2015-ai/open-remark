import type { Metadata } from "next"
import Link from "next/link"
import { Logo } from "@/components/logo"
import { getListPage } from "@/lib/content"

export const metadata: Metadata = {
  title: "Terms of Service — OpenRemark",
  description: "The terms that govern your use of OpenRemark.",
}

type TermsSection = {
  title: string
  body: string[]
}

export default function TermsPage() {
  const { frontmatter } = getListPage("terms.md")
  const { title, lastUpdated, sections } = frontmatter as {
    title: string
    lastUpdated: string
    sections: TermsSection[]
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
        <p className="mb-12 text-step--1 text-muted-foreground">
          {lastUpdated}
        </p>

        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-3 text-step-1 font-semibold">
                {section.title}
              </h2>
              {section.body.map((paragraph) => (
                <p
                  key={paragraph}
                  className="text-step-0 leading-relaxed text-muted-foreground"
                >
                  {paragraph}
                </p>
              ))}
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
