# Widget Contributor Guide

## Overview

Vanilla TypeScript embed that mounts inside a **Shadow DOM** on any page. Bundles to `public/embed.js` via esbuild. No framework — all DOM is imperative.

## Source layout

```
widget/src/
  index.ts      — ZeonWidget class, lifecycle, all event handlers
  render.ts     — pure DOM builders (no side effects, no imports from index.ts)
  api.ts        — fetch wrappers for /api/widget/* endpoints
  auth.ts       — Google OAuth PKCE popup flow, sessionStorage JWT
  types.ts      — shared TypeScript types
  constants.ts  — magic numbers (char limits, popup dimensions)
  styles.css    — all widget CSS (scoped inside Shadow DOM)
```

## Build

```bash
pnpm widget:build   # minified → public/embed.js + debug → public/embed.debug.js
```

Build reads `.env` then `.env.local`. Needs `NEXT_PUBLIC_APP_URL` and `GOOGLE_CLIENT_ID` at build time — they are inlined as compile-time constants.

## Compile-time constants

Three values are injected by esbuild `define` — **never read `process.env` in widget source**:

| Constant | Source |
|---|---|
| `__APP_URL__` | `NEXT_PUBLIC_APP_URL` env var |
| `__GOOGLE_CLIENT_ID__` | `GOOGLE_CLIENT_ID` env var |
| `__STYLES__` | `styles.css` inlined as a string |

## Rendering model

`ZeonWidget.render()` wipes `this.root` and rebuilds everything. Use it when auth state changes or comments load.

`ZeonWidget.patchComment(id)` swaps a single `[data-id]` element using `replaceWith()`. Use it for isolated state changes (like, reply open/close, edit open/close, delete confirm open/close). Falls back to `render()` if the element is not found.

```
User action → handler mutates state → patchComment(id) or render()
```

## Key classes / interfaces

**`ZeonWidget`** (`index.ts`) — one instance per `[data-open-remark]` element.

- `buildHandlers()` → `CommentHandlers` — callback object passed to all render functions
- `buildState()` → `CommentState` — snapshot of current UI state passed to all render functions
- `buildCommentMap()` — rebuilds the `Map<id, CommentData>` after any mutation; call it whenever `this.comments` changes
- `findComment(id)` — O(1) lookup via the map

**`CommentHandlers` / `CommentState`** (`render.ts`) — the only way render functions communicate back to the widget. No globals, no closures capturing widget internals.

## Adding a new handler

1. Add the callback to `CommentHandlers` in `render.ts`
2. Wire it in `buildHandlers()` in `index.ts`
3. Pass it through to whichever render function needs it
4. Call `patchComment(id)` or `render()` at the end of the handler

## Styling

All CSS lives in `styles.css`. Classes are prefixed `z-` to avoid host-page collisions. The Shadow DOM isolates styles — host-page CSS cannot leak in.

Theme variables (`--z-bg`, `--z-text`, etc.) are set on `:host` by `buildThemeStyle()` at runtime. Dark mode is detected from `document.documentElement.classList.contains("dark")` via a `MutationObserver`.

## Auth

Widget uses its own JWT (`WIDGET_JWT_SECRET`), stored in `sessionStorage` (not cookies — widget is cross-origin). Auth.js admin session is completely separate.

Flow: Google OAuth popup → `/api/widget/oauth-callback` → `postMessage` → `POST /api/widget/auth` → 7-day Widget JWT.

## Checklist before committing

```bash
pnpm typecheck   # must pass clean
pnpm format      # auto-fixes formatting (runs as pre-commit hook)
pnpm lint        # warnings in public/embed.js are expected and pre-existing
```
