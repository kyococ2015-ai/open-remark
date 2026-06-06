# Embedding OpenRemark in Astro

## Prerequisites

- An Astro site (v3+)
- An OpenRemark account with a registered site
- Your **site key** from the dashboard

## 1. Create a Comments component

Create `src/components/OpenRemark.astro`:

```astro
<div
  data-open-remark
  data-site-key="YOUR_SITE_KEY"
>
</div>

<script is:inline>
  function loadOpenRemark() {
    const oldScript = document.querySelector(
      "script[data-open-remark-script]",
    );

    if (oldScript) oldScript.remove();

    const script = document.createElement("script");
    script.src = "https://your-domain.com/embed.js";
    script.async = true;
    script.setAttribute("data-open-remark-script", "true");

    document.body.appendChild(script);
  }

  // first load
  loadOpenRemark();

  // astro page transitions
  document.addEventListener("astro:page-load", loadOpenRemark);
</script>
```

Replace `YOUR_SITE_KEY` and the script `src` with your values from the dashboard.

## 2. Add to your layout

In `src/layouts/BlogPost.astro`:

```astro
---
import OpenRemark from "../components/OpenRemark.astro";
---

<article>
  <slot />
</article>

<section aria-label="Comments">
  <OpenRemark />
</section>
```

## Allowed origins

Add `https://yourblog.com` (and `https://www.yourblog.com` if applicable) to
the **Allowed origins** list in your site's Settings page. OpenRemark will
reject widget posts from unlisted origins.

## Self-hosting note

If you self-host OpenRemark, replace `https://your-domain.com` with your
deployment URL in the `<script>` tag and in your site's allowed origins.
