# Embedding OpenRemark in Hugo

## Prerequisites

- A Hugo site (v0.110+)
- An OpenRemark account with a registered site
- Your **site key** from the dashboard

## 1. Create a comments partial

Create `layouts/partials/open-remark.html`:

```html
<div
  data-open-remark
  data-site-key="{{ .Site.Params.openRemarkSiteKey }}"
></div>
<script async src="{{ .Site.Params.openRemarkEmbedUrl }}"></script>
```

## 2. Add config params

In `config.toml` (or `hugo.toml`):

```toml
[params]
  openRemarkSiteKey  = "YOUR_SITE_KEY"
  openRemarkEmbedUrl = "https://your-domain.com/embed.js"
```

Or in `config.yaml`:

```yaml
params:
  openRemarkSiteKey: "YOUR_SITE_KEY"
  openRemarkEmbedUrl: "https://your-domain.com/embed.js"
```

## 3. Add to single post layout

In `layouts/posts/single.html` (or `layouts/_default/single.html`):

```html
{{ define "main" }}
<article>
  <h1>{{ .Title }}</h1>
  {{ .Content }}
</article>

<section aria-label="Comments">
  {{ partial "open-remark.html" . }}
</section>
{{ end }}
```

## Allowed origins

Add `https://yourblog.com` to the **Allowed origins** list in your site's
Settings page on the OpenRemark dashboard.
