# Embedding OpenRemark in Next.js

## Prerequisites

- A Next.js site (v13+ App Router)
- A OpenRemark account with a registered site
- Your **site key** from the dashboard

## 1. Create a Comments component

Create `components/ZeonComments.tsx`:

```tsx
"use client";

import Script from "next/script";

type Props = {
  slug: string;
};

export function ZeonComments({ slug }: Props) {
  return (
    <>
      <div
        data-open-remark
        data-site-key={process.env.NEXT_PUBLIC_ZEON_SITE_KEY}
        data-slug={slug}
      />
      <Script
        src={`${process.env.NEXT_PUBLIC_ZEON_EMBED_URL}/embed.js`}
        strategy="lazyOnload"
      />
    </>
  );
}
```

## 2. Add environment variables

In `.env.local`:

```env
NEXT_PUBLIC_ZEON_SITE_KEY=YOUR_SITE_KEY
NEXT_PUBLIC_ZEON_EMBED_URL=https://your-domain.com
```

## 3. Add to your blog post page

In `app/blog/[slug]/page.tsx`:

```tsx
import { ZeonComments } from "@/components/ZeonComments";

export default async function BlogPost({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getPost(params.slug);

  return (
    <article>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />

      <section aria-label="Comments" className="mt-16">
        <ZeonComments slug={`/blog/${params.slug}`} />
      </section>
    </article>
  );
}
```

## Using a stable slug

Use a consistent slug format regardless of post title changes. A good pattern:

```tsx
// Use the database ID or a stable identifier, not the URL-derived slug
<ZeonComments slug={`/blog/${post.id}`} />
```

This way, if you rename the post URL, existing comments follow the stable ID.

## Allowed origins

Add `https://yourblog.com` to the **Allowed origins** list in your site's
Settings page on the OpenRemark dashboard. For local dev, add
`http://localhost:3000` too (remove it before going to production).

## Content Security Policy

If your Next.js site sets a CSP header, add `https://your-domain.com` to
`script-src` and `connect-src`:

```js
// next.config.mjs
const cspHeader = `
  script-src 'self' https://your-domain.com https://accounts.google.com;
  connect-src 'self' https://your-domain.com https://oauth2.googleapis.com;
`;
```
