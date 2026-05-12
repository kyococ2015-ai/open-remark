# Embedding Zeon Comments in Astro

## Prerequisites

- An Astro site (v3+)
- A Zeon Comments account with a registered site
- Your **site key** from the dashboard

## 1. Create a Comments component

Create `src/components/ZeonComments.astro`:

```astro
---
// Pass the slug dynamically from Astro.params:
const { slug } = Astro.props;
---

<div
  data-zeon-comments
  data-site-key="..."
  data-slug={slug}
>
</div>

<script is:inline>
  function loadZeonComments() {
    // prevent duplicate scripts
    const oldScript = document.querySelector(
      "script[data-zeon-comments-script]",
    );

    if (oldScript) oldScript.remove();

    const script = document.createElement("script");
    script.src = "https://zeon-comments.vercel.app/embed.js";
    script.async = true;
    script.setAttribute("data-zeon-comments-script", "true");

    document.body.appendChild(script);
  }

  // first load
  loadZeonComments();

  // astro page transitions
  document.addEventListener("astro:page-load", loadZeonComments);
</script>
```

Replace `...` with your site key from the dashboard.

## 2. Add to blog post layout

In your `src/layouts/BlogPost.astro`:

```astro
---
import ZeonComments from "../components/ZeonComments.astro";

const { slug } = Astro.props;
---

<article>
  <slot />
</article>

<section aria-label="Comments">
  <ZeonComments slug={slug} />
</section>
```

## 3. Pass the slug from your blog collection

In `src/pages/blog/[slug].astro`:

```astro
---
import { getCollection } from "astro:content";
import BlogPost from "../../layouts/BlogPost.astro";

export async function getStaticPaths() {
  const posts = await getCollection("blog");
  return posts.map((post) => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content } = await post.render();
---

<BlogPost slug={`/blog/${post.slug}`}>
  <Content />
</BlogPost>
```

## Allowed origins

Add `https://yourblog.com` (and `https://www.yourblog.com` if applicable) to
the **Allowed origins** list in your site's Settings page. Zeon Comments will
reject widget posts from unlisted origins.

## Self-hosting note

If you self-host Zeon Comments, replace `https://your-domain.com` with your
deployment URL in the `<script>` tag and in your site's allowed origins.
