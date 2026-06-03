# Email Notifications Section Redesign

**Date:** 2026-06-03  
**File:** `components/dashboard/site-settings-form.tsx`  
**Scope:** The `Email Notifications` `<Card>` only (lines ~638–813). No changes to other cards, services, API routes, or schema.

---

## Goal

Upgrade the Email Notifications card to be visually consistent with the rest of the settings page, and replace the plain text inputs for Logo URL and Accent Color with proper, purpose-built controls.

---

## Approved Design

### Card structure (top to bottom)

```
CardHeader — title + description (unchanged)
CardContent
  ├── Toggle row (Enable notifications + Switch) — unchanged
  ├── Separator
  ├── "Email" sub-section label
  │   └── grid grid-cols-2 gap-6   [50 / 50]
  │       ├── Left col — config fields (Subject prefix, Logo URL, Accent color, Footer text)
  │       └── Right col — static mini email preview (JSX, no iframe, no API call)
  ├── Separator
  ├── "SMTP Relay" sub-section label + hint — unchanged
  │   └── Host/Port grid, Username, Password, From address — unchanged
  └── Action row — Save, Preview: New Comment, Preview: Reply — unchanged
```

---

## Component Details

### Sub-section labels

Use `text-sm font-medium` (matches existing SMTP label in the current code). No uppercase/tracking — keep consistent with the rest of the card.

### Logo URL field

```tsx
<div className="flex flex-col gap-1.5">
  <Label htmlFor="email-logo-url">Logo URL</Label>
  <div className="flex items-center gap-2">
    {/* Thumbnail — updates on blur */}
    <div className="size-10 flex-shrink-0 rounded-md border border-input bg-muted flex items-center justify-center overflow-hidden">
      {previewLogoUrl
        ? <img src={previewLogoUrl} alt="Logo" className="h-full w-full object-contain" />
        : <ImageIcon className="size-4 text-muted-foreground" />}
    </div>
    <Input
      id="email-logo-url"
      placeholder="https://yourdomain.com/logo.png"
      value={emailLogoUrl}
      onChange={(e) => setEmailLogoUrl(e.target.value)}
      onBlur={() => setPreviewLogoUrl(emailLogoUrl)}
    />
  </div>
  <p className="text-xs text-muted-foreground">PNG or SVG shown at top of notification emails.</p>
</div>
```

New local state: `const [previewLogoUrl, setPreviewLogoUrl] = useState(initialSite.emailLogoUrl ?? "")`

### Accent color field

Identical pattern to the existing `primaryColor` picker in the Embed Appearance card:

```tsx
<div className="flex flex-col gap-2">
  <Label htmlFor="email-accent-color">Accent color</Label>
  <div className="flex items-center gap-2">
    <input
      id="email-accent-color"
      type="color"
      value={emailAccentColor || "#6366f1"}
      onChange={(e) => setEmailAccentColor(e.target.value)}
      onBlur={() => setPreviewAccentColor(emailAccentColor)}
      className="h-9 w-12 cursor-pointer rounded-md border border-input bg-background p-0.5"
    />
    <Input
      value={emailAccentColor}
      onChange={(e) => setEmailAccentColor(e.target.value)}
      onBlur={() => setPreviewAccentColor(emailAccentColor)}
      pattern="^#[0-9a-fA-F]{6}$"
      className="max-w-36 font-mono uppercase"
      maxLength={7}
    />
    <div className="ml-2 flex flex-wrap gap-1.5">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => { setEmailAccentColor(c); setPreviewAccentColor(c) }}
          className="size-6 rounded-full border border-input transition-transform hover:scale-110"
          style={{ backgroundColor: c }}
          aria-label={`Use ${c}`}
        />
      ))}
    </div>
  </div>
  <p className="text-xs text-muted-foreground">Used for buttons and headers in notification emails.</p>
</div>
```

New local state: `const [previewAccentColor, setPreviewAccentColor] = useState(initialSite.emailAccentColor ?? "#6366f1")`

Preset dots clicking updates preview immediately (no blur needed since value is set directly).

### Mini email preview (right column)

Static JSX — no API call, no iframe. Reflects `previewLogoUrl` and `previewAccentColor` in real time (these states are set on blur / preset click).

```tsx
<div className="flex flex-col gap-2">
  <p className="text-sm font-medium">Preview</p>
  <div className="rounded-lg border border-input overflow-hidden text-sm">
    {/* Header */}
    <div className="flex items-center gap-2 px-4 py-3" style={{ backgroundColor: previewAccentColor || "#6366f1" }}>
      {previewLogoUrl
        ? <img src={previewLogoUrl} alt="" className="h-6 w-auto object-contain" />
        : <div className="size-6 rounded bg-white/20 flex items-center justify-center text-white text-[10px] font-bold">L</div>}
      <span className="text-sm font-semibold text-white">Your Site</span>
    </div>
    {/* Body */}
    <div className="px-4 py-3 bg-background flex flex-col gap-2">
      <p className="font-medium text-foreground">New comment on your post</p>
      <p className="text-xs text-muted-foreground">Alex left a comment on "Getting started"</p>
      <div
        className="self-start rounded px-3 py-1.5 text-xs font-medium text-white"
        style={{ backgroundColor: previewAccentColor || "#6366f1" }}
      >
        View comment →
      </div>
    </div>
    {/* Footer */}
    <div className="px-4 py-2 border-t border-input bg-muted/40">
      <p className="text-[10px] text-muted-foreground truncate">
        {emailFooterText || "You're receiving this because you commented on this site."}
      </p>
    </div>
  </div>
</div>
```

Footer text in the preview reflects the live `emailFooterText` state (no blur gate needed — textarea already has onChange).

### 50/50 grid wrapper

```tsx
<div className="grid grid-cols-2 gap-6 items-start">
  {/* Left — config fields */}
  <div className="flex flex-col gap-4">
    {/* Subject prefix */}
    {/* Logo URL */}
    {/* Accent color */}
    {/* Footer text */}
  </div>
  {/* Right — mini preview */}
  <div>
    {/* Mini email preview */}
  </div>
</div>
```

---

## State changes

| New state | Type | Initial value |
|---|---|---|
| `previewLogoUrl` | `string` | `initialSite.emailLogoUrl ?? ""` |
| `previewAccentColor` | `string` | `initialSite.emailAccentColor ?? "#6366f1"` |

No new API calls, no schema changes, no new files.

---

## Imports needed

Add `ImageIcon` from `lucide-react` (used in logo thumbnail placeholder).

---

## What does NOT change

- Toggle logic and `smtpConfigured` guard
- All SMTP fields (host, port, user, pass, from) — layout and behaviour unchanged
- `handleSaveEmail`, `handlePreview` functions — unchanged
- Preview dialog (`Dialog` with iframe) — unchanged
- Save / Preview buttons row — unchanged
- All other cards on the page — untouched
