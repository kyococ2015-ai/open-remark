# Embedding Zeon Comments in Hugo

## Prerequisites

- A Hugo site (v0.110+)
- A Zeon Comments account with a registered site
- Your **site key** from the dashboard

## 1. Create a comments partial

Create `layouts/partials/zeon-comments.html`:

```html
<div
  data-zeon-comments
  data-site-key="{{ .Site.Params.zeonSiteKey }}"
  data-slug="{{ .RelPermalink }}"
></div>
<script async src="{{ .Site.Params.zeonEmbedUrl }}"></script>
```

## 2. Add config params

In `config.toml` (or `hugo.toml`):

```toml
[params]
  zeonSiteKey   = "YOUR_SITE_KEY"
  zeonEmbedUrl  = "https://your-domain.com/embed.js"
```

Or in `config.yaml`:

```yaml
params:
  zeonSiteKey: "YOUR_SITE_KEY"
  zeonEmbedUrl: "https://your-domain.com/embed.js"
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
  {{ partial "zeon-comments.html" . }}
</section>
{{ end }}
```

## Using `.RelPermalink` vs custom slug

`{{ .RelPermalink }}` produces a path like `/posts/my-first-post/`, which is
stable as long as the post URL doesn't change. If you rename a post, old
comments will appear on the old slug — use a custom front matter field for
stability:

```toml
# post front matter
[params]
  commentSlug = "my-first-post-2024"
```

Then in the partial:

```html
data-slug="{{ with .Params.commentSlug }}{{ . }}{{ else }}{{ .RelPermalink }}{{ end }}"
```

## Allowed origins

Add `https://yourblog.com` to the **Allowed origins** list in your site's
Settings page on the Zeon Comments dashboard.
