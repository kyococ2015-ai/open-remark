import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getSiteByIdForOwner } from "@/lib/services/site-service";
import { PageHeader } from "@/components/dashboard/page-header";
import { InstallSnippet } from "@/components/dashboard/install-snippet";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = { params: Promise<{ siteId: string }> };

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
// In your .astro frontmatter, pass the slug dynamically:
const { slug } = Astro.params;
---

<!-- Anywhere in your template -->
<div
  data-zeon-comments
  data-site-key="${site.siteKey}"
  data-slug={slug}
></div>
<script async src="${appUrl}/embed.js"></script>`;

  const hugoSnippet = `{{/* In your layouts/partials/comments.html */}}
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
      <PageHeader
        title="Install Snippet"
        description={`Embed Zeon Comments on ${site.name}`}
      />

      <div className="p-6 space-y-6 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your site key</CardTitle>
            <CardDescription>
              Keep this key in your templates. It identifies your site when
              receiving comments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InstallSnippet code={site.siteKey} language="plaintext" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">HTML / Generic</CardTitle>
            <CardDescription>
              Works in any static site. Replace the slug with your page path.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InstallSnippet code={htmlSnippet} language="html" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Astro</CardTitle>
          </CardHeader>
          <CardContent>
            <InstallSnippet code={astroSnippet} language="astro" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hugo</CardTitle>
          </CardHeader>
          <CardContent>
            <InstallSnippet code={hugoSnippet} language="hugo" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Next.js</CardTitle>
          </CardHeader>
          <CardContent>
            <InstallSnippet code={nextSnippet} language="tsx" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
