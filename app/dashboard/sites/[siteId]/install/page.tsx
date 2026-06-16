import { auth } from "@/lib/auth"
import { notFound } from "next/navigation"
import { requireSiteAccess } from "@/lib/services/membership-service"
import { InstallSnippet } from "@/components/dashboard/install-snippet"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import Link from "next/link"
import { CheckCircle2 } from "lucide-react"

type Props = { params: Promise<{ siteId: string }> }

function StepHeader({
  number,
  title,
  description,
}: {
  number: number
  title: string
  description?: string
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
        {number}
      </div>
      <div>
        <h2 className="text-base leading-tight font-semibold">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  )
}

export default async function InstallPage({ params }: Props) {
  const { siteId } = await params
  const session = await auth()

  let site
  try {
    const res = await requireSiteAccess(siteId, session!.user!.id, "MANAGE_SETTINGS")
    site = res.site
  } catch {
    notFound()
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://your-domain.com"

  const htmlSnippet = `<!-- Open Remark -->
<div
  data-open-remark
  data-site-key="${site.siteKey}"
></div>
<script async src="${appUrl}/embed.js"></script>`

  const astroSnippet = `---
// src/components/OpenRemark.astro
---

<div
  data-open-remark
  data-site-key="${site.siteKey}"
>
</div>

<script is:inline>
  function loadOpenRemark() {
    const oldScript = document.querySelector(
      "script[data-open-remark-script]",
    );
    if (oldScript) oldScript.remove();

    const script = document.createElement("script");
    script.src = "${appUrl}/embed.js";
    script.async = true;
    script.setAttribute("data-open-remark-script", "true");
    document.body.appendChild(script);
  }

  loadOpenRemark();

  // re-mount on Astro page transitions
  document.addEventListener("astro:page-load", loadOpenRemark);
</script>`

  const hugoSnippet = `{{/* layouts/partials/open-remark.html */}}
<div
  data-open-remark
  data-site-key="${site.siteKey}"
></div>
<script async src="${appUrl}/embed.js"></script>

{{/* In your single layout: */}}
{{/* {{ partial "open-remark.html" . }} */}}`

  const nextSnippet = `// components/OpenRemark.tsx
"use client";
import Script from "next/script";

export function OpenRemark() {
  return (
    <>
      <div
        data-open-remark
        data-site-key="${site.siteKey}"
      />
      <Script src="${appUrl}/embed.js" strategy="lazyOnload" />
    </>
  );
}

// Usage in any page or layout:
// import { OpenRemark } from "@/components/OpenRemark";
// <OpenRemark />`

  return (
    <div>
      <div className="flex max-w-3xl flex-col gap-10 p-6">
        {/* Step 1 */}
        <div className="flex flex-col gap-4">
          <StepHeader
            number={1}
            title="Save your site key"
            description="This key identifies your site. You'll need it in the snippet below."
          />
          <div className="ml-12">
            <InstallSnippet code={site.siteKey} language="plaintext" />
          </div>
        </div>

        {/* Divider */}
        <div className="ml-12 border-t" />

        {/* Step 2 */}
        <div className="flex flex-col gap-4">
          <StepHeader
            number={2}
            title="Add the snippet to your site"
            description="Pick your framework and paste the code where you want comments to appear."
          />
          <div className="ml-12">
            <Tabs defaultValue="html">
              <TabsList>
                <TabsTrigger value="html">HTML</TabsTrigger>
                <TabsTrigger value="astro">Astro</TabsTrigger>
                <TabsTrigger value="hugo">Hugo</TabsTrigger>
                <TabsTrigger value="nextjs">Next.js</TabsTrigger>
              </TabsList>
              <TabsContent value="html">
                <InstallSnippet code={htmlSnippet} language="html" />
              </TabsContent>
              <TabsContent value="astro">
                <InstallSnippet code={astroSnippet} language="astro" />
              </TabsContent>
              <TabsContent value="hugo">
                <InstallSnippet code={hugoSnippet} language="hugo" />
              </TabsContent>
              <TabsContent value="nextjs">
                <InstallSnippet code={nextSnippet} language="tsx" />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Divider */}
        <div className="ml-12 border-t" />

        {/* Step 3 */}
        <div className="flex flex-col gap-4">
          <StepHeader
            number={3}
            title="Verify the integration"
            description="Open a page on your site where you added the snippet. You should see the OpenRemark widget. Post a test comment to confirm everything works."
          />
          <div className="ml-12 flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            <CheckCircle2 className="text-success size-4 shrink-0" />
            Once comments appear on your page, you&apos;re all set.
          </div>
        </div>

        {/* Divider */}
        <div className="ml-12 border-t" />

        {/* Done */}
        <div className="ml-12 flex gap-3">
          <Button asChild>
            <Link href={`/dashboard/sites/${siteId}`}>
              Go to site dashboard
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/sites">All sites</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
