# Embed Widget Theme Auto-Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the embed widget dynamically detect and follow the host page’s dark-mode state (`<html class="dark">`) when the site theme is set to `AUTO`, falling back to the OS preference.

**Architecture:** Add a `resolveEffectiveTheme` helper that returns concrete `LIGHT` | `DARK`, update `buildThemeStyle` to use it, add an `applyTheme` instance method that stores the active config and updates the shadow `<style>`, and attach a `MutationObserver` on `<html>` plus a `MediaQueryList` listener so the widget re-applies the theme live when `AUTO` is active.

**Tech Stack:** Vanilla TypeScript, esbuild, Shadow DOM, CSS custom properties.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `widget/src/index.ts` | Modify | Core widget class — add resolution logic, observers, lifecycle wiring. |
| `widget/test-theme.html` | Create | Manual browser test page for toggling `html.dark` and verifying live theme updates. |

---

### Task 1: Add `resolveEffectiveTheme` and update `buildThemeStyle`

**Files:**
- Modify: `widget/src/index.ts`

- [ ] **Step 1: Add `DEFAULT_THEME` constant and `resolveEffectiveTheme` helper near the top of the file**

Insert directly after the `readableOn` function (before `buildThemeStyle`):

```ts
const DEFAULT_THEME: WidgetThemeConfig = {
  theme: "AUTO",
  primaryColor: "#0f172a",
  radius: 8,
};

function resolveEffectiveTheme(cfg: WidgetThemeConfig): "LIGHT" | "DARK" {
  if (cfg.theme === "LIGHT") return "LIGHT";
  if (cfg.theme === "DARK") return "DARK";
  if (document.documentElement.classList.contains("dark")) return "DARK";
  if (
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "DARK";
  }
  return "LIGHT";
}
```

- [ ] **Step 2: Replace `buildThemeStyle` body to use `resolveEffectiveTheme`**

Replace the existing `buildThemeStyle` function entirely with:

```ts
function buildThemeStyle(cfg: WidgetThemeConfig): string {
  const lines: string[] = [];
  const effective = resolveEffectiveTheme(cfg);

  if (effective === "DARK") {
    lines.push(`:host {
  --z-bg: #0f172a;
  --z-text: #f8fafc;
  --z-border: #1e293b;
  --z-muted: #94a3b8;
  --z-subtle: #1e293b;
  --z-accent: #1e293b;
  --z-skel-base: #1e293b;
  --z-skel-glow: #334155;
}`);
  } else {
    lines.push(`:host {
  --z-bg: #ffffff;
  --z-text: #0f172a;
  --z-border: #e2e8f0;
  --z-muted: #64748b;
  --z-subtle: #f1f5f9;
  --z-accent: #f1f5f9;
  --z-skel-base: #e8edf2;
  --z-skel-glow: #f8fafc;
}`);
  }

  lines.push(`:host {
  --z-primary: ${cfg.primaryColor};
  --z-primary-fg: ${readableOn(cfg.primaryColor)};
  --z-radius: ${cfg.radius}px;
}`);

  return lines.join("\n");
}
```

- [ ] **Step 3: Commit**

```bash
git add widget/src/index.ts
git commit -m "feat(widget): add resolveEffectiveTheme and update buildThemeStyle"
```

---

### Task 2: Add `applyTheme` instance method and dynamic observers

**Files:**
- Modify: `widget/src/index.ts`

- [ ] **Step 1: Add three new private fields to the `ZeonWidget` class**

Insert directly after `private isBanned = false;` (around line 102):

```ts
  private activeConfig: WidgetThemeConfig | null = null;
  private htmlObserver: MutationObserver | null = null;
  private mediaQueryListener: (() => void) | null = null;
```

- [ ] **Step 2: Add `applyTheme` and `setupThemeObservers` methods inside the class**

Insert directly after the `render()` method (before the closing `}` of the class):

```ts
  private applyTheme(cfg: WidgetThemeConfig) {
    this.activeConfig = cfg;
    this.themeStyle.textContent = buildThemeStyle(cfg);
  }

  private setupThemeObservers() {
    const reapply = () => {
      if (this.activeConfig && this.activeConfig.theme === "AUTO") {
        this.applyTheme(this.activeConfig);
      }
    };

    let rafId: number | null = null;
    const debouncedReapply = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        reapply();
      });
    };

    this.htmlObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes" && m.attributeName === "class") {
          debouncedReapply();
          return;
        }
      }
    });
    this.htmlObserver.observe(document.documentElement, { attributes: true });

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    this.mediaQueryListener = debouncedReapply;
    if (mql.addEventListener) {
      mql.addEventListener("change", this.mediaQueryListener);
    } else {
      // Safari < 14 fallback
      (mql as unknown as { addListener: (cb: () => void) => void }).addListener(
        this.mediaQueryListener,
      );
    }
  }
```

- [ ] **Step 3: Commit**

```bash
git add widget/src/index.ts
git commit -m "feat(widget): add applyTheme and dynamic theme observers"
```

---

### Task 3: Wire theme application into widget lifecycle

**Files:**
- Modify: `widget/src/index.ts`

- [ ] **Step 1: Update the constructor to use `applyTheme` and call `setupThemeObservers`**

Replace the existing constructor block:

```ts
    this.themeStyle = document.createElement("style");
    const cached = loadCachedTheme(config.siteKey);
    if (cached) this.themeStyle.textContent = buildThemeStyle(cached);
    this.shadow.appendChild(this.themeStyle);
```

With:

```ts
    this.themeStyle = document.createElement("style");
    const cached = loadCachedTheme(config.siteKey);
    this.applyTheme(cached ?? { ...DEFAULT_THEME });
    this.shadow.appendChild(this.themeStyle);
    this.setupThemeObservers();
```

- [ ] **Step 2: Update `loadComments` to use `applyTheme` instead of direct assignment**

Replace:

```ts
      this.themeStyle.textContent = buildThemeStyle(themeConfig);
```

With:

```ts
      this.applyTheme(themeConfig);
```

- [ ] **Step 3: Commit**

```bash
git add widget/src/index.ts
git commit -m "feat(widget): wire applyTheme into constructor and loadComments"
```

---

### Task 4: Build widget and manual verification

**Files:**
- Create: `widget/test-theme.html`

- [ ] **Step 1: Build the widget**

Run:
```bash
yarn widget:build
```

Expected output should show two esbuild completions (production and debug) with no errors.

- [ ] **Step 2: Create manual test page**

Create `widget/test-theme.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zeon Widget Theme Test</title>
  <style>
    body { font-family: sans-serif; padding: 40px; }
    button { padding: 10px 20px; font-size: 16px; cursor: pointer; margin-bottom: 20px; }
    html.dark { background: #0f172a; color: #f8fafc; }
    #widget-wrap { max-width: 640px; }
  </style>
</head>
<body>
  <h1>Embed Widget Theme Test</h1>
  <button id="toggle">Toggle html.dark</button>
  <p>Current host theme: <strong id="state">light</strong></p>

  <div id="widget-wrap">
    <!-- Replace data-site-key and data-slug with values from your local DB -->
    <div data-zeon-comments data-site-key="YOUR_SITE_KEY" data-slug="test-page"></div>
  </div>

  <!-- Points to the debug build so CSS is readable -->
  <script src="../public/embed.debug.js"></script>

  <script>
    const btn = document.getElementById('toggle');
    const state = document.getElementById('state');
    btn.addEventListener('click', () => {
      document.documentElement.classList.toggle('dark');
      state.textContent = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    });
  </script>
</body>
</html>
```

- [ ] **Step 3: Verify in browser**

1. Start the Next.js dev server (`yarn dev`) so the widget API is available.
2. Open `widget/test-theme.html` in a browser (you can use `npx serve .` from the repo root and navigate to `/widget/test-theme.html`).
3. Replace `YOUR_SITE_KEY` with a real site key from your local database.
4. Load the page. Observe the widget’s background/text colors.
5. Click **"Toggle html.dark"**. The widget should immediately switch to the opposite color scheme.
6. Toggle again — it should switch back.
7. (Optional) Set the site theme to `DARK` in the dashboard, hard-refresh the page, and click the toggle. The widget should **stay dark** because the backend override takes precedence.

- [ ] **Step 4: Commit**

```bash
git add widget/test-theme.html
git commit -m "test(widget): add manual theme toggle verification page"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- `resolveEffectiveTheme` with host-page-class priority → Task 1
- `buildThemeStyle` using resolved theme → Task 1
- `applyTheme` storing active config → Task 2
- `MutationObserver` on `<html>` + `MediaQueryList` listener → Task 2
- Dynamic re-apply only when `theme === "AUTO"` → Task 2 (`reapply` guard)
- Constructor initial render with cached/default config → Task 3
- `loadComments` wiring → Task 3
- Manual verification page → Task 4

**2. Placeholder scan:** No TBD, TODO, or vague steps. All code is complete.

**3. Type consistency:**
- `WidgetThemeConfig` used throughout.
- `activeConfig: WidgetThemeConfig | null`.
- `applyTheme(cfg: WidgetThemeConfig)`.
- `resolveEffectiveTheme(cfg: WidgetThemeConfig) -> "LIGHT" | "DARK"`.

No inconsistencies found.
