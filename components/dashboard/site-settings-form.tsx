"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

type Theme = "AUTO" | "LIGHT" | "DARK"

type Site = {
  id: string
  name: string
  domain: string
  autoApprove: boolean
  allowedOrigins: string
  theme: Theme
  primaryColor: string
  radius: number
}

const PRESET_COLORS = [
  "#0f172a", // slate
  "#2563eb", // blue
  "#16a34a", // green
  "#dc2626", // red
  "#9333ea", // purple
  "#ea580c", // orange
  "#0891b2", // cyan
  "#db2777", // pink
]

type Props = {
  site: Site
}

export function SiteSettingsForm({ site: initialSite }: Props) {
  const router = useRouter()
  const [site, setSite] = useState<Site>(initialSite)
  const [loading, setLoading] = useState(false)
  const [savingAppearance, setSavingAppearance] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Local appearance state for live preview
  const [theme, setTheme] = useState<Theme>(site.theme)
  const [primaryColor, setPrimaryColor] = useState(site.primaryColor)
  const [radius, setRadius] = useState(site.radius)

  const siteId = site.id

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const originsRaw = (form.get("allowedOrigins") as string)
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)

    const res = await fetch(`/api/v1/sites/${siteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: (form.get("name") as string) || "",
        domain: (form.get("domain") as string) || "",
        autoApprove: form.get("autoApprove") === "on",
        allowedOrigins: originsRaw,
      }),
    })

    if (res.ok) {
      toast.success("Settings saved")
      setSite(await res.json())
    } else {
      toast.error("Failed to save")
    }
    setLoading(false)
  }

  async function handleSaveAppearance() {
    setSavingAppearance(true)
    const res = await fetch(`/api/v1/sites/${siteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme, primaryColor, radius }),
    })

    if (res.ok) {
      toast.success("Appearance saved")
      setSite(await res.json())
    } else {
      toast.error("Failed to save appearance")
    }
    setSavingAppearance(false)
  }

  async function handleDelete() {
    if (
      !confirm("Delete this site and all its comments? This cannot be undone.")
    )
      return
    setDeleting(true)
    const res = await fetch(`/api/v1/sites/${siteId}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Site deleted")
      router.push("/dashboard/sites")
    } else {
      toast.error("Failed to delete")
      setDeleting(false)
    }
  }

  const origins = (() => {
    try {
      return (JSON.parse(site.allowedOrigins) as string[]).join("\n")
    } catch {
      return ""
    }
  })()

  const appearanceDirty =
    theme !== site.theme ||
    primaryColor !== site.primaryColor ||
    radius !== site.radius

  return (
    <div className="flex max-w-2xl flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">General</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Site name</Label>
              <Input id="name" name="name" defaultValue={site.name} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="domain">Domain</Label>
              <Input
                id="domain"
                name="domain"
                defaultValue={site.domain}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="allowedOrigins">
                Allowed origins (one per line)
              </Label>
              <Textarea
                id="allowedOrigins"
                name="allowedOrigins"
                defaultValue={origins}
                rows={4}
                placeholder={"https://myblog.com\nhttps://www.myblog.com"}
              />
              <p className="text-xs text-muted-foreground">
                Only these origins can post comments via the embed. Use * to
                allow all (not recommended).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoApprove"
                name="autoApprove"
                defaultChecked={site.autoApprove}
                className="size-4 rounded border-input"
              />
              <Label htmlFor="autoApprove" className="cursor-pointer">
                Auto-approve comments
              </Label>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Embed appearance</CardTitle>
          <CardDescription>
            Controls how the comment widget looks on your site. Applied globally
            — visitors don&apos;t configure anything.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {/* Theme */}
          <div className="flex flex-col gap-2">
            <Label>Theme</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["AUTO", "LIGHT", "DARK"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                    theme === t
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:bg-accent"
                  }`}
                >
                  {t === "AUTO" ? "Auto" : t === "LIGHT" ? "Light" : "Dark"}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Auto detects your page&apos;s dark mode. If the{" "}
              <code>&lt;html&gt;</code> element has a <code>dark</code> class,
              the widget renders in dark mode; otherwise it uses light mode.
            </p>
          </div>

          {/* Primary color */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="primaryColor">Primary color</Label>
            <div className="flex items-center gap-2">
              <input
                id="primaryColor"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded-md border border-input bg-background p-0.5"
                aria-label="Primary color"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                pattern="^#[0-9a-fA-F]{6}$"
                className="max-w-36 font-mono uppercase"
              />
              <div className="ml-2 flex flex-wrap gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setPrimaryColor(c)}
                    className="size-6 rounded-full border border-input transition-transform hover:scale-110"
                    style={{ backgroundColor: c }}
                    aria-label={`Use ${c}`}
                  />
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Used for the post button and accent details.
            </p>
          </div>

          {/* Radius */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="radius">Border radius</Label>
              <span className="text-xs text-muted-foreground tabular-nums">
                {radius}px
              </span>
            </div>
            <input
              id="radius"
              type="range"
              min={0}
              max={24}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          {/* Live preview */}
          <div className="flex flex-col gap-2">
            <Label>Preview</Label>
            <div
              className="rounded-lg border p-4"
              style={{
                borderRadius: `${radius * 1.5}px`,
                background: theme === "DARK" ? "#0f172a" : "#ffffff",
                color: theme === "DARK" ? "#f8fafc" : "#0f172a",
                borderColor: theme === "DARK" ? "#1e293b" : "#e2e8f0",
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm font-semibold">3 Comments</div>
                <button
                  type="button"
                  className="rounded-md px-3 py-1.5 text-xs font-medium"
                  style={{
                    background: primaryColor,
                    color:
                      parseInt(primaryColor.slice(1), 16) > 0xaaaaaa
                        ? "#0f172a"
                        : "#ffffff",
                    borderRadius: `${radius * 0.6}px`,
                  }}
                >
                  Post comment
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              onClick={handleSaveAppearance}
              disabled={!appearanceDirty || savingAppearance}
            >
              {savingAppearance ? "Saving…" : "Save appearance"}
            </Button>
            {appearanceDirty && (
              <Button
                variant="ghost"
                onClick={() => {
                  setTheme(site.theme)
                  setPrimaryColor(site.primaryColor)
                  setRadius(site.radius)
                }}
              >
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            Danger Zone
          </CardTitle>
          <CardDescription>
            Permanently delete this site and all its comments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete site"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
