# Dashboard Design Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the dashboard overview page and sidebar from a rounded, card-based UI to a sharp, editorial aesthetic.

**Architecture:** Remove all `<Card>` wrappers from the overview page, replace with section-based layouts using `<Separator>`. Set global radius to 0. Refactor stat-card to a plain component. Update sidebar to remove rounding from logo and avatar.

**Tech Stack:** Next.js App Router, React, Tailwind CSS v4, shadcn/ui components.

---

### File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `app/globals.css` | Modify | Set `--radius: 0rem` to disable global rounding |
| `components/dashboard/stat-card.tsx` | Modify | Remove Card wrapper, render as plain flex column with icon+label+value |
| `app/dashboard/page.tsx` | Modify | Remove all Card usage, apply editorial layout with separators, left-border hover, p-8 spacing |
| `components/dashboard/app-sidebar.tsx` | Modify | Remove `rounded-lg` from logo mark and avatar |

---

### Task 1: Disable Global Rounding

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Set radius to 0**

Change `--radius: 0.75rem` to `--radius: 0rem` in both `:root` and `.dark` blocks.

```css
--radius: 0rem;
```

- [ ] **Step 2: Verify no syntax errors**

Run: `npx prisma validate` (or any quick build check)

Expected: No CSS parse errors.

---

### Task 2: Refactor Stat Card

**Files:**
- Modify: `components/dashboard/stat-card.tsx`

- [ ] **Step 1: Remove Card import and wrapper**

Remove: `import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";`

Replace the entire component body with:

```tsx
export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  variant = "default",
}: Props) {
  const valueColor = {
    default: "text-foreground",
    warning: "text-warning",
    success: "text-success",
    destructive: "text-destructive",
  }[variant];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div className={`text-3xl font-bold tabular-nums ${valueColor}`}>
        {value}
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify component compiles**

Expected: No TypeScript errors.

---

### Task 3: Redesign Overview Page

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Remove Card imports and add Separator**

Remove:
```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
```

Add:
```tsx
import { Separator } from "@/components/ui/separator";
```

- [ ] **Step 2: Restructure layout**

Replace the outer `div` content with:

```tsx
<PageHeader title="Overview" description="Summary of all your sites and comments" />

<div className="p-8 flex flex-col gap-8">
  {/* Stats grid */}
  <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 border-b pb-8">
    <StatCard title="Total Sites" value={overview.totalSites} icon={RiGlobalLine} />
    <StatCard title="Total Comments" value={overview.totalComments} icon={RiMessage2Line} />
    <StatCard
      title="Pending Review"
      value={overview.pendingComments}
      icon={RiTimeLine}
      variant="warning"
      description={overview.pendingComments > 0 ? "Needs attention" : "All clear"}
    />
    <StatCard title="Approved" value={overview.approvedComments} icon={RiCheckboxCircleLine} variant="success" />
  </div>

  {/* Pending alert */}
  {overview.pendingComments > 0 && (
    <div className="border-l-2 border-warning px-4 py-3 flex items-center justify-between">
      <p className="text-sm text-warning">
        <strong>{overview.pendingComments}</strong> comment
        {overview.pendingComments !== 1 ? "s" : ""} waiting for review across your sites
      </p>
      <Button asChild size="sm" variant="outline">
        <Link href="/dashboard/sites">Review now</Link>
      </Button>
    </div>
  )}

  <div className="grid gap-8 lg:grid-cols-2">
    {/* Sites list */}
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Your Sites
        </h2>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/sites" className="flex items-center gap-1">
            View all <RiArrowRightLine className="size-3.5" />
          </Link>
        </Button>
      </div>
      <Separator />
      <div className="flex flex-col">
        {overview.sites.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No sites yet.</p>
        ) : (
          overview.sites.map((site) => (
            <Link
              key={site.id}
              href={`/dashboard/sites/${site.id}`}
              className="flex items-center gap-4 py-4 border-b transition-all hover:border-l-2 hover:border-primary hover:pl-3"
            >
              <div className="flex size-9 shrink-0 items-center justify-center bg-muted text-sm font-medium">
                {site.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{site.name}</p>
                <p className="text-xs text-muted-foreground truncate">{site.domain}</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                <span>{site._count.pages} page{site._count.pages !== 1 ? "s" : ""}</span>
                <span>{site.pages.reduce((acc, p) => acc + p._count.comments, 0)} comments</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>

    {/* Recent comments */}
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Recent Comments
      </h2>
      <Separator />
      <div className="flex flex-col">
        {overview.recentComments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No comments yet.</p>
        ) : (
          overview.recentComments.map((comment) => (
            <Link
              key={comment.id}
              href={`/dashboard/sites/${comment.page.site.id}/comments?status=${comment.status}`}
              className="flex items-center gap-4 py-4 border-b transition-all hover:border-l-2 hover:border-primary hover:pl-3"
            >
              <Avatar className="size-8 shrink-0 rounded-none">
                <AvatarFallback className="rounded-none text-xs">
                  {comment.authorName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{comment.authorName}</p>
                  <Badge
                    variant={
                      comment.status === "APPROVED"
                        ? "default"
                        : comment.status === "PENDING"
                          ? "secondary"
                          : comment.status === "SPAM"
                            ? "destructive"
                            : "outline"
                    }
                    className="text-xs h-4 px-1 rounded-none"
                  >
                    {comment.status.toLowerCase()}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {comment.page.site.name} · {comment.page.slug}
                </p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Verify page compiles**

Run: `npm run build` or `next build`

Expected: No TypeScript or build errors.

---

### Task 4: Update Sidebar

**Files:**
- Modify: `components/dashboard/app-sidebar.tsx`

- [ ] **Step 1: Remove rounded classes**

Find and replace:
- `rounded-lg` on logo mark → remove
- `rounded-lg` on Avatar → remove
- `rounded-lg` on AvatarFallback → remove

Logo mark change (line ~72):
```tsx
<div className="flex size-8 shrink-0 items-center justify-center bg-primary text-primary-foreground shadow-sm">
```

Avatar change (line ~143):
```tsx
<Avatar className="size-7 shrink-0">
```

AvatarFallback change (line ~145):
```tsx
<AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
```

- [ ] **Step 2: Verify sidebar compiles**

Expected: No TypeScript errors.

---

### Task 5: Visual Verification

**Files:**
- `app/dashboard/page.tsx`
- `components/dashboard/stat-card.tsx`
- `components/dashboard/app-sidebar.tsx`
- `app/globals.css`

- [ ] **Step 1: Start dev server and inspect**

Run: `npm run dev`

Navigate to `/dashboard`.

Checklist:
- [ ] All corners are sharp (cards, buttons, avatars, badges, inputs).
- [ ] Stat cards show icon + label + large number, no card wrapper.
- [ ] Pending alert has left yellow border, no background fill.
- [ ] Sites list has section title + separator, rows have bottom border, hover shows left border accent.
- [ ] Comments list same style as sites, avatars and badges are rectangular.
- [ ] Sidebar logo and avatar are rectangular.
- [ ] Layout is responsive on mobile and desktop.

- [ ] **Step 2: Commit**

```bash
git add app/globals.css components/dashboard/stat-card.tsx app/dashboard/page.tsx components/dashboard/app-sidebar.tsx docs/superpowers/specs/2026-05-07-dashboard-design-overhaul.md
git commit -m "feat: redesign dashboard with editorial aesthetic and sharp corners"
```
