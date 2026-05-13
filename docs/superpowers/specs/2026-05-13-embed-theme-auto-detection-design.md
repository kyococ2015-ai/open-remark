# Embed Widget Theme Auto-Detection Design

**Date:** 2026-05-13
**Scope:** Widget (embed.js) only — no backend or API changes.

## Problem

When a site’s dashboard theme setting is `AUTO`, the widget currently relies on the CSS `prefers-color-scheme: dark` media query. It does **not** check whether the host page itself is in dark mode (e.g., `<html class="dark">` as used by Tailwind / shadcn / Next.js sites). This causes the widget to appear in the wrong theme on sites that manage their own dark-mode toggle independently of the OS preference.

## Goal

When the site theme is `AUTO`, the widget must:
1. **Prioritize** the host page’s dark-mode signal (`<html class="dark">`).
2. **Fall back** to the OS/system preference (`prefers-color-scheme: dark`) if the host page provides no signal.
3. **React dynamically** — if the host page toggles dark mode after the widget has loaded, the widget must update its theme live.

If the site theme is explicitly `LIGHT` or `DARK`, the widget must ignore both host-page and system signals.

## Resolution Order

```
1. Backend theme = LIGHT  → LIGHT
2. Backend theme = DARK   → DARK
3. Backend theme = AUTO:
   a. document.documentElement.classList.contains("dark") → DARK
   b. window.matchMedia("(prefers-color-scheme: dark)").matches → DARK
   c. Otherwise → LIGHT
```

## Architecture

### New Helper: `resolveEffectiveTheme`

Pure function that takes a `WidgetThemeConfig` and returns the concrete `"LIGHT" | "DARK"` to render.

### Updated Helper: `buildThemeStyle`

Instead of branching on `cfg.theme`, it calls `resolveEffectiveTheme(cfg)` and emits the same light/dark `:host` variable blocks it does today. Because the injected `<style>` element is appended *after* the base stylesheet inside the shadow root, its `:host` rules override the CSS `prefers-color-scheme` media query by cascade order.

### New Instance Method: `applyTheme(cfg)`

1. Stores `cfg` as `this.activeConfig`.
2. Runs `buildThemeStyle(cfg)` and writes it to `this.themeStyle.textContent`.
3. Called:
   - During constructor (with cached or default config).
   - After `fetchComments` returns a fresh config.
   - Whenever an observer detects a change **and** `this.activeConfig.theme === "AUTO"`.

### Dynamic Observation

Two lightweight listeners are attached once in the constructor:

1. **MutationObserver** on `document.documentElement`
   - Observes `attributes` (filtering to `class` inside the callback).
   - Re-calls `applyTheme(this.activeConfig)` only when `theme === "AUTO"`.
2. **MediaQueryList change listener**
   - `window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ...)`
   - Same conditional re-apply.

Both callbacks are batched via `requestAnimationFrame` to avoid thrashing if multiple mutations fire in quick succession.

### Cleanup

No explicit cleanup is required for the initial version; the observers are bound to the document and are negligible in cost. If a `destroy()` method is added later, the observer and media-query listener can be disconnected there.

## Files to Modify

- `widget/src/index.ts` — add `resolveEffectiveTheme`, update `buildThemeStyle`, add `applyTheme`, attach observers.
- No other files require changes.

## Edge Cases & Error Handling

| Scenario | Behavior |
|----------|----------|
| `window.matchMedia` absent | Default to `LIGHT`. |
| Host page removes `dark` class after load | Observer flips widget to light (or system-derived) instantly. |
| Backend later returns fixed `LIGHT`/`DARK` | `applyTheme` obeys it; observers continue to fire but are no-ops because `theme !== "AUTO"`. |
| Private browsing / storage quota | `saveCachedTheme` already catches; unchanged. |
| Multiple widgets on same page | Each widget owns its own observer instances; harmless duplication. |

## Testing Strategy

1. **Unit:** Test `resolveEffectiveTheme` with mocked `document.documentElement.classList` and `window.matchMedia`.
2. **Manual (host-page class):** Embed widget on a page with a button that toggles `document.documentElement.classList.toggle('dark')`. Verify widget colors swap immediately.
3. **Manual (system preference):** Set OS to dark mode while host page has no `dark` class. Verify widget renders dark. Toggle OS to light. Verify widget flips.
4. **Manual (fixed override):** Set dashboard theme to `DARK`. Toggle host page `dark` class and OS preference. Verify widget stays dark.

## No-Go / Out of Scope

- Changes to the Prisma schema.
- Changes to API routes (`/api/widget/comments`).
- Changes to the dashboard UI.
- Requiring host sites to add extra `data-*` attributes.
