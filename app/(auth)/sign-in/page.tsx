import { auth, signIn } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"

export default async function SignInPage() {
  const session = await auth()
  if (session) redirect("/dashboard")

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Left — brand panel */}
      <div className="relative hidden flex-col justify-between bg-foreground p-12 text-background lg:flex">
        {/* Subtle grid texture */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-background) 1px, transparent 1px), linear-gradient(90deg, var(--color-background) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            R
          </span>
          <span className="text-sm font-semibold tracking-tight">
            Open Remark
          </span>
        </div>

        {/* Hero copy */}
        <div className="relative space-y-6">
          <p className="text-4xl leading-[1.15] font-semibold tracking-tight text-pretty">
            Comments that belong
            <br />
            to your site — not
            <br />
            someone else&apos;s platform.
          </p>

          <ul className="space-y-3 text-sm text-background/60">
            {[
              "Self-hosted, open source, yours forever",
              "Drop-in embed — one script tag",
              "Moderation, spam filtering, full control",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  className="size-3.5 shrink-0 text-primary"
                  fill="currentColor"
                >
                  <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <p className="relative text-xs text-background/30">
          Open source · MIT license
        </p>
      </div>

      {/* Right — sign-in form */}
      <div className="flex flex-col items-center justify-center px-6 py-16">
        {/* Mobile logo */}
        <div className="mb-10 flex items-center gap-2.5 lg:hidden">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            R
          </span>
          <span className="text-sm font-semibold tracking-tight">
            Open Remark
          </span>
        </div>

        <div className="w-full max-w-[360px] space-y-8">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-pretty">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to your dashboard to manage comments and sites.
            </p>
          </div>

          <form
            action={async () => {
              "use server"
              await signIn("google", { redirectTo: "/dashboard" })
            }}
          >
            <Button
              type="submit"
              variant="outline"
              className="w-full"
              size="lg"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="mr-2 size-4 shrink-0"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            By signing in you agree to our{" "}
            <a
              href="/terms"
              className="underline underline-offset-4 transition-colors hover:text-foreground"
            >
              Terms of Service
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
