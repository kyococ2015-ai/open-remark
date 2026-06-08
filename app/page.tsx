import type { Metadata } from "next"
import Link from "next/link"
import config from "@/config/config.json"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  MessageSquare,
  Globe,
  ShieldCheck,
  Zap,
  Code2,
  ArrowRight,
} from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Logo } from "@/components/logo"

export const metadata: Metadata = {
  description: config.metadata.meta_description,
  authors: [{ name: config.metadata.meta_author }],
  openGraph: {
    description: config.metadata.meta_description,
    images: [config.metadata.meta_image],
  },
  twitter: {
    card: "summary_large_image",
    description: config.metadata.meta_description,
    images: [config.metadata.meta_image],
  },
}

const features = [
  {
    icon: Globe,
    title: "Works everywhere",
    description:
      "Drop two lines of HTML into any Astro, Hugo, or Next.js site. No build step required on your end.",
  },
  {
    icon: ShieldCheck,
    title: "Built-in moderation",
    description:
      "Approve, reject, or mark spam from your dashboard. Pre-moderation on by default — nothing goes live without your sign-off.",
  },
  {
    icon: MessageSquare,
    title: "Threaded replies",
    description:
      "Visitors can reply to individual comments, keeping discussions focused and readable.",
  },
  {
    icon: Zap,
    title: "Google sign-in",
    description:
      "One-click authentication for visitors. No passwords, no friction, real identities.",
  },
  {
    icon: Code2,
    title: "Shadow DOM isolated",
    description:
      "The widget lives in a shadow DOM — your site styles never bleed in, and widget styles never leak out.",
  },
  {
    icon: ShieldCheck,
    title: "Origin allowlisting",
    description:
      "Only your registered domains can post comments. No cross-site abuse.",
  },
]

const embedSnippet = `<div
  data-open-remark
  data-site-key="YOUR_SITE_KEY"
  data-slug="/posts/hello-world"
></div>
<script async src="${process.env.NEXT_PUBLIC_APP_URL}/embed.js"></script>`

export default function HomePage() {
  return (
    <div className="flex min-h-svh flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <nav
          className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4"
          aria-label="Main navigation"
        >
          <Link href="/" className="flex items-center font-semibold">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost">
              <Link
                href="https://github.com/zeon-studio/open-remark"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open OpenRemark GitHub repository"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="size-5"
                  aria-hidden="true"
                >
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.11.82-.26.82-.577 0-.285-.01-1.04-.015-2.04-3.338.725-4.042-1.61-4.042-1.61-.546-1.385-1.333-1.754-1.333-1.754-1.09-.745.083-.73.083-.73 1.205.085 1.84 1.236 1.84 1.236 1.07 1.835 2.805 1.305 3.49.997.108-.775.42-1.305.762-1.605-2.665-.304-5.466-1.335-5.466-5.935 0-1.31.47-2.38 1.235-3.22-.125-.303-.535-1.525.115-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.655 1.65.245 2.873.12 3.176.77.84 1.235 1.91 1.235 3.22 0 4.61-2.805 5.625-5.475 5.92.43.37.81 1.1.81 2.22 0 1.605-.015 2.895-.015 3.285 0 .315.21.69.825.575C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </Link>
            </Button>
            <Button asChild>
              <Link href="/sign-in">
                Get started
                <ArrowRight className="ml-1 size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </nav>
      </header>

      <main id="main-content">
        {/* Hero */}
        <section className="relative mx-auto max-w-5xl overflow-hidden px-4 pt-28 pb-16 text-center">
          <Badge
            variant="secondary"
            className="mb-5 rounded-sm px-3 py-3 text-sm"
          >
            Open source · Self-hostable
          </Badge>
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-balance sm:text-6xl lg:text-7xl">
            Comments for your
            <br />
            static website
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-xl leading-relaxed text-balance text-muted-foreground">
            Add a fully-featured comment system to any Astro, Hugo, or Next.js
            site in two lines of HTML. Google sign-in, threaded replies, spam
            protection, and a moderation dashboard — all included.
          </p>
          <div className="mb-16 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="h-13 px-8 text-base">
              <Link href="/sign-in">
                Start for free
                <ArrowRight className="ml-2 size-5" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-13 px-8 text-base"
            >
              <Link href="/demo.html" target="_blank" rel="noopener">
                Live demo
              </Link>
            </Button>
          </div>

          {/* Video — browser chrome */}
          <div className="relative">
            {/* Ambient glow behind card */}
            <div
              className="pointer-events-none absolute inset-x-0 -bottom-6 mx-auto h-24 w-2/3 rounded-full bg-primary/20 blur-3xl"
              aria-hidden="true"
            />
            <div className="relative overflow-hidden rounded-xl border bg-card shadow-2xl ring-1 ring-primary/10">
              {/* Chrome bar */}
              <div className="flex items-center gap-1.5 border-b bg-muted/60 px-4 py-3">
                <div
                  className="size-2.5 rounded-full bg-red-400"
                  aria-hidden="true"
                />
                <div
                  className="size-2.5 rounded-full bg-yellow-400"
                  aria-hidden="true"
                />
                <div
                  className="size-2.5 rounded-full bg-green-400"
                  aria-hidden="true"
                />
                <div className="mx-auto rounded-sm bg-background/80 px-8 py-0.5 font-mono text-xs text-muted-foreground">
                  open-remark · demo
                </div>
              </div>
              {/* 16:9 iframe */}
              <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src="https://www.youtube-nocookie.com/embed/uOYTTEZhHfI?rel=0&modestbranding=1"
                  title="OpenRemark Demo"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </section>

        {/* Code snippet */}
        <section className="border-y bg-muted/40 py-16">
          <div className="mx-auto max-w-3xl px-4">
            <p className="mb-6 text-center text-sm font-medium tracking-wider text-muted-foreground uppercase">
              Embed in 2 lines
            </p>
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <div className="flex items-center gap-1.5 border-b bg-muted/50 px-4 py-3">
                <div
                  className="size-2.5 rounded-full bg-red-400"
                  aria-hidden="true"
                />
                <div
                  className="size-2.5 rounded-full bg-yellow-400"
                  aria-hidden="true"
                />
                <div
                  className="size-2.5 rounded-full bg-green-400"
                  aria-hidden="true"
                />
                <span className="ml-2 font-mono text-xs text-muted-foreground">
                  your-post.html
                </span>
              </div>
              <pre className="overflow-x-auto p-6 font-mono text-sm leading-relaxed">
                <code>{embedSnippet}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-5xl px-4 py-28">
          <h2 className="mb-4 text-center text-3xl font-bold text-balance">
            Everything you need, nothing you don&apos;t
          </h2>
          <p className="mb-14 text-center text-lg text-balance text-muted-foreground">
            No tracking pixels, no cookie banners, no third-party data sharing.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="flex flex-col gap-3 rounded-xl border bg-card p-6"
              >
                <div className="flex size-10 items-center justify-center rounded-md bg-primary/10">
                  <f.icon className="size-5 text-primary" aria-hidden="true" />
                </div>
                <h3 className="text-base font-semibold">{f.title}</h3>
                <p className="text-base leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-y bg-muted/40 py-28">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="mb-14 text-center text-3xl font-bold text-balance">
              Up and running in minutes
            </h2>
            <ol className="flex flex-col gap-10" aria-label="Setup steps">
              {[
                {
                  step: "1",
                  title: "Create your account",
                  body: "Sign in with Google. No credit card required.",
                },
                {
                  step: "2",
                  title: "Register your site",
                  body: "Add your domain and get a unique site key from the dashboard.",
                },
                {
                  step: "3",
                  title: "Paste the snippet",
                  body: "Drop the two-line embed into your blog post template. Works in any SSG.",
                },
                {
                  step: "4",
                  title: "Moderate from the dashboard",
                  body: "Approve, reject, or mark comments as spam — all from one place.",
                },
              ].map((item) => (
                <li key={item.step} className="flex gap-5">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="mb-1.5 text-base font-semibold">
                      {item.title}
                    </h3>
                    <p className="text-base text-muted-foreground">
                      {item.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-2xl px-4 py-28 text-center">
          <h2 className="mb-5 text-4xl font-bold text-balance">
            Ready to add comments?
          </h2>
          <p className="mb-10 text-xl leading-relaxed text-balance text-muted-foreground">
            Free to get started. Self-host on your own infrastructure if you
            prefer.
          </p>
          <Button asChild size="lg" className="h-13 px-8 text-base">
            <Link href="/sign-in">
              Get started free
              <ArrowRight className="ml-2 size-5" aria-hidden="true" />
            </Link>
          </Button>
        </section>
      </main>

      <ThemeToggle />

      {/* Footer */}
      <footer className="mt-auto border-t">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
          <Logo />

          <p>
            An open source project by{" "}
            <Link
              href="https://zeon.studio?ref=openremark"
              target="_blank"
              rel="noopener"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Zeon Studio
            </Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
