import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Globe,
  ShieldCheck,
  Zap,
  Code2,
  ArrowRight,
} from "lucide-react";

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
];

const embedSnippet = `<div
  data-zeon-comments
  data-site-key="YOUR_SITE_KEY"
  data-slug="/posts/hello-world"
></div>
<script async src="https://your-domain.com/embed.js"></script>`;

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-svh">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <nav
          className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4"
          aria-label="Main navigation"
        >
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-sm"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">
              Z
            </div>
            Zeon Comments
          </Link>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/sign-in">
                Get started
                <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </nav>
      </header>

      <main id="main-content">
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-4 py-24 text-center">
          <Badge variant="secondary" className="mb-4">
            Open source · Self-hostable
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-balance mb-6">
            Comments for your
            <br />
            static website
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground text-balance mb-8">
            Add a fully-featured comment system to any Astro, Hugo, or Next.js
            site in two lines of HTML. Google sign-in, threaded replies, spam
            protection, and a moderation dashboard — all included.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/sign-in">
                Start for free
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/demo.html" target="_blank" rel="noopener">
                Live demo
              </Link>
            </Button>
          </div>
        </section>

        {/* Code snippet */}
        <section className="bg-muted/40 border-y py-16">
          <div className="mx-auto max-w-3xl px-4">
            <p className="text-center text-sm font-medium text-muted-foreground mb-6 uppercase tracking-wider">
              Embed in 2 lines
            </p>
            <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
              <div className="flex items-center gap-1.5 px-4 py-3 border-b bg-muted/50">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400" aria-hidden="true" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" aria-hidden="true" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-400" aria-hidden="true" />
                <span className="ml-2 text-xs text-muted-foreground font-mono">
                  your-post.html
                </span>
              </div>
              <pre className="p-6 text-sm font-mono leading-relaxed overflow-x-auto">
                <code>{embedSnippet}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-5xl px-4 py-24">
          <h2 className="text-2xl font-bold text-center mb-3 text-balance">
            Everything you need, nothing you don&apos;t
          </h2>
          <p className="text-center text-muted-foreground mb-12 text-balance">
            No tracking pixels, no cookie banners, no third-party data sharing.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-lg border bg-card p-5 space-y-2"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                  <f.icon className="h-4 w-4 text-primary" aria-hidden="true" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="bg-muted/40 border-y py-24">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-2xl font-bold text-center mb-12 text-balance">
              Up and running in minutes
            </h2>
            <ol className="space-y-8" aria-label="Setup steps">
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
                <li key={item.step} className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h2 className="text-3xl font-bold mb-4 text-balance">
            Ready to add comments?
          </h2>
          <p className="text-muted-foreground mb-8 text-balance">
            Free to get started. Self-host on your own infrastructure if you prefer.
          </p>
          <Button asChild size="lg">
            <Link href="/sign-in">
              Get started free
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="mx-auto max-w-5xl px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div
            className="flex items-center gap-2"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground font-bold text-xs" aria-hidden="true">
              Z
            </div>
            <span>Zeon Comments</span>
          </div>
          <p>Built with Next.js, Prisma &amp; shadcn/ui</p>
        </div>
      </footer>
    </div>
  );
}
