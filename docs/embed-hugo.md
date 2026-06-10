# Embedding OpenRemark in Hugo

Use the Hugo module at
[gethugothemes/hugo-modules/components/open-remark](https://github.com/gethugothemes/hugo-modules/tree/master/components/open-remark).

## Prerequisites

- A Hugo site with Hugo Modules enabled (run `hugo mod init <module-path>` if your site isn't a module yet)
- Go installed (required by Hugo Modules)
- An OpenRemark account with a registered site
- Your **site key** from the dashboard

## 1. Install the module

Add the import to `config/_default/module.toml`:

```toml
[[imports]]
path = "github.com/gethugothemes/hugo-modules/components/open-remark"
```

Then fetch it:

```bash
hugo mod get -u
hugo mod tidy
```

## 2. Configure params

Add to `config/_default/params.toml`:

```toml
# OpenRemark Comments
[open_remark]
enable = true
site_key = ""                                          # your site key from the OpenRemark dashboard
embed_url = "https://open-remark.zeon.studio/embed.js" # OpenRemark embed.js URL
```

If you self-host OpenRemark, set `embed_url` to `https://your-domain.com/embed.js`.

Set `enable = false` to hide comments without removing the module.

## 3. Render the partial

Call the partial in your single-page layout (e.g. `layouts/posts/single.html` or `layouts/_default/single.html`):

```html
{{ define "main" }}
<article>
  <h1>{{ .Title }}</h1>
  {{ .Content }}
</article>

<section aria-label="Comments">
  <!-- open-remark comment -->
  {{ partial "open-remark.html" . }}
</section>
{{ end }}
```

The partial is a no-op unless `open_remark.enable` is `true` and both
`site_key` and `embed_url` are set, so it's safe to leave in place across
environments.

## 4. Allow your origin

Add `https://yourblog.com` to the **Allowed origins** list on your site's
Settings page in the OpenRemark dashboard. Without this, the widget API will
reject requests from the browser.

## Updating

Pull module updates with:

```bash
hugo mod get -u ./...
hugo mod tidy
```
