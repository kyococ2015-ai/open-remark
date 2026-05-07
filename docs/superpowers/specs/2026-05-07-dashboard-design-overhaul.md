# Dashboard Design Overhaul — Editorial Dashboard

**Date:** 2026-05-07
**Scope:** `app/dashboard/page.tsx`, `components/dashboard/stat-card.tsx`, `components/dashboard/page-header.tsx`, `components/dashboard/app-sidebar.tsx`
**Goal:** Transform the dashboard from a rounded, card-based UI to a sharp, editorial, content-management aesthetic while preserving all shadcn/ui design tokens and components.

---

## Design Direction

**Editorial Dashboard — Structured & Airy**

Inspired by content management systems and editorial tools. Replaces card containers with clear section dividers, increases whitespace, and establishes strong typography hierarchy. All corners are sharp (`rounded-none`).

---

## Principles

1. **No rounded corners.** Every element uses sharp edges.
2. **No card wrappers.** Sections are separated by `<Separator>` and whitespace.
3. **Typography hierarchy.** Large stats, uppercase section labels, clear data alignment.
4. **Subtle interactions.** Left-border accent on hover instead of background color shifts.
5. **Semantic colors.** Continue using shadcn tokens (`text-primary`, `text-warning`, `text-success`, `text-muted-foreground`).

---

## Global Changes

### CSS / Tokens
- Set `--radius: 0rem` in `globals.css` to disable default rounding globally.
- All shadcn components will automatically inherit sharp corners.

### Sidebar (`components/dashboard/app-sidebar.tsx`)
- Logo mark: `rounded-none` instead of `rounded-lg`.
- Avatar: `rounded-none` instead of `rounded-lg`.
- Menu items: remove any explicit rounding.
- Keep all shadcn Sidebar primitives.

### Page Header (`components/dashboard/page-header.tsx`)
- Already sharp; no changes needed beyond verifying no rounding classes.

---

## Page: Overview (`app/dashboard/page.tsx`)

### Layout
- Outer wrapper: `p-8` (increased from `p-6`).
- Remove all `<Card>` usage.
- Use `<Separator>` between major sections.
- Flex column with `gap-8` between sections.

### Stat Cards Section
- 4-column grid (`grid gap-8 sm:grid-cols-2 lg:grid-cols-4`).
- Each stat:
  - Small muted icon (`size-4 text-muted-foreground`) inline with label.
  - Label: `text-xs font-medium text-muted-foreground uppercase tracking-wider`.
  - Value: `text-3xl font-bold tabular-nums` with semantic color.
  - Description (optional): `text-xs text-muted-foreground` below value.
- Section has a subtle bottom border (`border-b pb-8`).

### Pending Alert
- Sharp container: `border-l-2 border-warning px-4 py-3`.
- No background fill, no rounded corners.
- Button: `variant="outline"` with sharp corners (inherited from global radius change).

### Sites List Section
- Section title: `text-sm font-semibold uppercase tracking-wider text-muted-foreground`.
- `<Separator>` below title.
- Each row:
  - `flex items-center gap-4 py-4 border-b`.
  - Text avatar: first letter of site name in `size-9 bg-muted flex items-center justify-center text-sm font-medium`.
  - Site name: `text-sm font-medium truncate`.
  - Domain: `text-xs text-muted-foreground truncate`.
  - Page/comment counts: right-aligned, `text-xs text-muted-foreground`.
  - Hover: `hover:border-l-2 hover:border-primary hover:pl-3` transition.
- "View all" link: ghost button, right of section title.

### Recent Comments Section
- Same structure as Sites List.
- Avatar: `<Avatar className="size-8 rounded-none">` with `<AvatarFallback className="rounded-none">`.
- Badge: keep semantic variants, ensure `rounded-none`.
- Hover: same left-border accent pattern.

---

## Component: Stat Card (`components/dashboard/stat-card.tsx`)

Refactor to a simpler component:
- Remove `<Card>` wrapper.
- Accept `icon`, `title`, `value`, `description`, `variant`.
- Render as a plain div with flex column layout.
- Variant maps to text color class on the value only.

---

## Files to Modify

1. `app/globals.css` — set `--radius: 0rem`
2. `app/dashboard/page.tsx` — remove Cards, apply editorial layout
3. `components/dashboard/stat-card.tsx` — remove Card wrapper, new layout
4. `components/dashboard/app-sidebar.tsx` — remove rounding from logo, avatar

---

## Out of Scope

- No changes to data fetching or logic.
- No changes to other dashboard pages (`/dashboard/sites/*`, `/dashboard/account`).
- No changes to auth or API routes.

---

## Verification

- [ ] All corners are sharp (no `rounded-*` classes remain in modified files).
- [ ] shadcn components still used (Card removed from page, but still available in UI library).
- [ ] Semantic color tokens used throughout.
- [ ] Hover interactions work (left border accent).
- [ ] Layout is responsive (`sm:grid-cols-2`, `lg:grid-cols-4`).
