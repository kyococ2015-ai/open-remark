# Embedding OpenRemark in Next.js

## Prerequisites

- A Next.js site (v13+ App Router)
- An OpenRemark account with a registered site
- Your **site key** from the dashboard

## 1. Create a Comments component

Create `components/OpenRemark.tsx`:

```tsx
"use client";

import Script from "next/script";

export function OpenRemark() {
  return (
    <>
      <div
        data-open-remark
        data-site-key={process.env.NEXT_PUBLIC_OPEN_REMARK_SITE_KEY}
      />
      <Script
        src={`${process.env.NEXT_PUBLIC_OPEN_REMARK_URL}/embed.js`}
        strategy="lazyOnload"
      />
    </>
  );
}
```

## 2. Add environment variables

In `.env.local`:

```env
NEXT_PUBLIC_OPEN_REMARK_SITE_KEY=YOUR_SITE_KEY
NEXT_PUBLIC_OPEN_REMARK_URL=https://your-domain.com
```

## 3. Add to your blog post page

In `app/blog/[slug]/page.tsx`:

```tsx
import { OpenRemark } from "@/components/OpenRemark";

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);

  return (
    <article>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />

      <section aria-label="Comments" className="mt-16">
        <OpenRemark />
      </section>
    </article>
  );
}
```

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
