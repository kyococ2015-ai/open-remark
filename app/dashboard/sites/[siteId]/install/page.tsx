import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getSiteByIdForOwner } from "@/lib/services/site-service";
import { InstallSnippet } from "@/components/dashboard/install-snippet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

type Props = { params: Promise<{ siteId: string }> };

function StepHeader({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex gap-4 items-start">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
        {number}
      </div>
      <div>
        <h2 className="font-semibold text-base leading-tight">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}

export default async function InstallPage({ params }: Props) {
  const { siteId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  let site;
  try {
    site = await getSiteByIdForOwner(siteId, session.user.id);
  } catch {
    notFound();
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://your-domain.com";

  const htmlSnippet = `<!-- Zeon Comments -->
<div
  data-zeon-comments
  data-site-key="${site.siteKey}"
  data-slug="/your-post-slug"
></div>
<script async src="${appUrl}/embed.js"></script>`;

  const astroSnippet = `---
// Pass the slug dynamically from Astro.params:
const { slug } = Astro.params;
---

<div
  data-zeon-comments
  data-site-key="${site.siteKey}"
  data-slug={slug}
></div>
<script async src="${appUrl}/embed.js"></script>`;

  const hugoSnippet = `{{/* layouts/partials/comments.html */}}
<div
  data-zeon-comments
  data-site-key="${site.siteKey}"
  data-slug="{{ .RelPermalink }}"
></div>
<script async src="${appUrl}/embed.js"></script>`;

  const nextSnippet = `// components/Comments.tsx
"use client";
import Script from "next/script";

export function Comments({ slug }: { slug: string }) {
  return (
    <>
      <div
        data-zeon-comments
        data-site-key="${site.siteKey}"
        data-slug={slug}
      />
      <Script src="${appUrl}/embed.js" strategy="lazyOnload" />
    </>
  );
}`;

  return (
    <div>
      <div className="p-6 space-y-10 max-w-3xl">
        {/* Step 1 */}
        <div className="space-y-4">
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
        <div className="space-y-4">
          <StepHeader
            number={2}
            title="Add the snippet to your site"
            description="Pick your framework and paste the code where you want comments to appear. Replace the slug with the current page path."
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
        <div className="space-y-4">
          <StepHeader
            number={3}
            title="Verify the integration"
            description="Open a page on your site where you added the snippet. You should see the Zeon Comments widget. Post a test comment to confirm everything works."
          />
          <div className="ml-12 flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
            Once comments appear on your page, you're all set.
          </div>
        </div>

        {/* Divider */}
        <div className="ml-12 border-t" />

        {/* Done */}
        <div className="ml-12 flex gap-3">
          <Button asChild>
            <Link href={`/dashboard/sites/${siteId}`}>Go to site dashboard</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/sites">All sites</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
