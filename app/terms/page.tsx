import type { Metadata } from "next"
import Link from "next/link"
import { Logo } from "@/components/logo"

export const metadata: Metadata = {
  title: "Terms of Service — OpenRemark",
  description: "The terms that govern your use of OpenRemark.",
}

const sections = [
  {
    title: "1. Acceptance of terms",
    body: [
      `By creating an account, embedding the widget, or otherwise using OpenRemark ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.`,
    ],
  },
  {
    title: "2. The service",
    body: [
      `OpenRemark is a self-hostable comment system for static websites. When you sign in with Google and register a site, you become responsible for that site, its content, and the comments it collects.`,
    ],
  },
  {
    title: "3. Accounts",
    body: [
      `You must sign in with a valid Google account to access the dashboard. You're responsible for keeping your account credentials secure and for all activity that happens under your account.`,
    ],
  },
  {
    title: "4. Acceptable use",
    body: [
      `You agree not to use the Service to collect, store, or distribute content that is unlawful, harassing, defamatory, or that infringes on the rights of others. You're responsible for moderating comments submitted to your sites and for complying with applicable laws — including data protection laws — in the jurisdictions where your visitors are located.`,
    ],
  },
  {
    title: "5. Visitor content",
    body: [
      `Comments submitted through the widget remain the property of the visitors who wrote them. By operating a site on the Service, you accept responsibility for moderating that content (approving, rejecting, or marking it as spam) and for responding to removal requests from visitors or rights holders.`,
    ],
  },
  {
    title: "6. Self-hosting",
    body: [
      `OpenRemark is open source. If you run your own instance, these terms apply only to instances operated by us; self-hosted deployments are governed by the project's open-source license and your own policies.`,
    ],
  },
  {
    title: "7. Termination",
    body: [
      `We may suspend or terminate access to the Service if these terms are violated, or if continued access would create legal or security risk. You may stop using the Service and delete your sites at any time from the dashboard.`,
    ],
  },
  {
    title: "8. Disclaimers",
    body: [
      `The Service is provided "as is," without warranties of any kind, express or implied. We do not guarantee uninterrupted availability or that the Service will be free of errors.`,
    ],
  },
  {
    title: "9. Limitation of liability",
    body: [
      `To the maximum extent permitted by law, we are not liable for any indirect, incidental, or consequential damages arising from your use of the Service, including loss of data or comments.`,
    ],
  },
  {
    title: "10. Changes to these terms",
    body: [
      `OpenRemark is in beta and these terms may change as the project evolves. Material changes will be reflected on this page with an updated revision date.`,
    ],
  },
  {
    title: "11. Contact",
    body: [
      `Questions about these terms can be sent to the project maintainers via the GitHub repository.`,
    ],
  },
]

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="mb-12 text-sm text-muted-foreground">
          Last updated: June 8, 2026
        </p>

        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-3 text-xl font-semibold">{section.title}</h2>
              {section.body.map((paragraph) => (
                <p
                  key={paragraph}
                  className="leading-relaxed text-muted-foreground"
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
