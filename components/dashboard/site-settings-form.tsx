"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Eye, EyeOff, Loader2 } from "lucide-react"
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
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { InstallSnippet } from "@/components/dashboard/install-snippet"

type Theme = "AUTO" | "LIGHT" | "DARK"

type Site = {
  id: string
  name: string
  siteKey: string
  domain: string
  autoApprove: boolean
  allowedOrigins: string
  theme: Theme
  primaryColor: string
  radius: number
  emailNotificationsEnabled: boolean
  likeNotificationLimit: number
  emailSubjectPrefix: string | null
  emailLogoUrl: string | null
  emailAccentColor: string | null
  emailFooterText: string | null
  smtpHost: string | null
  smtpPort: number | null
  smtpUser: string | null
  smtpPass: string | null
  smtpFrom: string | null
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

function parseOrigins(raw: string): string[] {
  try {
    const arr = JSON.parse(raw) as string[]
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function SiteSettingsForm({ site: initialSite }: Props) {
  const router = useRouter()
  const [site, setSite] = useState<Site>(initialSite)
  const [loading, setLoading] = useState(false)
  const [savingAppearance, setSavingAppearance] = useState(false)
  const [deleting, setDeleting] = useState(false)

  type TransferStep =
    | "idle"
    | "looking"
    | "looked-up"
    | "transferring"
    | "success"
    | "error"
  const [transferEmail, setTransferEmail] = useState("")
  const [transferStep, setTransferStep] = useState<TransferStep>("idle")
  const [transferRecipient, setTransferRecipient] = useState<{
    name: string | null
    email: string
  } | null>(null)
  const [transferError, setTransferError] = useState("")
  const transferTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (transferTimerRef.current) clearTimeout(transferTimerRef.current)
    }
  }, [])

  const [originsText, setOriginsText] = useState(() =>
    parseOrigins(initialSite.allowedOrigins).join("\n")
  )

  const [emailEnabled, setEmailEnabled] = useState(
    initialSite.emailNotificationsEnabled
  )
  const [likeNotificationLimit, setLikeNotificationLimit] = useState(
    String(initialSite.likeNotificationLimit)
  )
  const [emailSubjectPrefix, setEmailSubjectPrefix] = useState(
    initialSite.emailSubjectPrefix ?? ""
  )
  const [emailLogoUrl, setEmailLogoUrl] = useState(
    initialSite.emailLogoUrl ?? ""
  )
  const [emailAccentColor, setEmailAccentColor] = useState(
    initialSite.emailAccentColor ?? ""
  )
  const [emailFooterText, setEmailFooterText] = useState(
    initialSite.emailFooterText ?? ""
  )
  const [smtpHost, setSmtpHost] = useState(initialSite.smtpHost ?? "")
  const [smtpPort, setSmtpPort] = useState(
    initialSite.smtpPort ? String(initialSite.smtpPort) : "465"
  )
  const [smtpUser, setSmtpUser] = useState(initialSite.smtpUser ?? "")
  const [smtpPass, setSmtpPass] = useState(initialSite.smtpPass ?? "")
  const [showSmtpPass, setShowSmtpPass] = useState(false)
  const [smtpFrom, setSmtpFrom] = useState(initialSite.smtpFrom ?? "")

  // smtpFrom is optional — falls back to smtpUser when smtpUser is an email
  const smtpConfigured =
    smtpHost.trim() !== "" && smtpUser.trim() !== "" && smtpPass.trim() !== ""

  // If SMTP config is removed, auto-disable notifications
  if (!smtpConfigured && emailEnabled) setEmailEnabled(false)

  const [savingEmail, setSavingEmail] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewType, setPreviewType] = useState<"new-comment" | "reply">(
    "new-comment"
  )
  const [previewHtml, setPreviewHtml] = useState("")
  const [previewLoading, setPreviewLoading] = useState(false)

  // Local appearance state for live preview
  const [theme, setTheme] = useState<Theme>(site.theme)
  const [primaryColor, setPrimaryColor] = useState(site.primaryColor)
  const [radius, setRadius] = useState(site.radius)

  const siteId = site.id

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const normalized = (form.get("allowedOrigins") as string)
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => (s === "*" ? s : s.replace(/\/+$/, "")))

    setOriginsText(normalized.join("\n"))

    const res = await fetch(`/api/v1/sites/${siteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: (form.get("name") as string) || "",
        domain: (form.get("domain") as string) || "",
        autoApprove: form.get("autoApprove") === "on",
        allowedOrigins: normalized,
      }),
    })

    if (res.ok) {
      toast.success("Settings saved")
      const updated = (await res.json()) as Site
      setSite(updated)
      setOriginsText(parseOrigins(updated.allowedOrigins).join("\n"))
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

  async function handleLookup() {
    setTransferStep("looking")
    setTransferError("")
    try {
      const res = await fetch(
        `/api/v1/users/lookup?email=${encodeURIComponent(transferEmail)}`
      )
      if (res.ok) {
        const user = (await res.json()) as {
          id: string
          name: string | null
          email: string
        }
        setTransferRecipient({ name: user.name, email: user.email })
        setTransferStep("looked-up")
      } else {
        const data = (await res.json()) as { error?: string }
        setTransferError(data.error ?? "No user found with that email.")
        setTransferStep("error")
      }
    } catch {
      setTransferError("Network error. Please try again.")
      setTransferStep("error")
    }
  }

  async function handleTransfer() {
    setTransferStep("transferring")
    try {
      const res = await fetch(`/api/v1/sites/${siteId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: transferEmail }),
      })
      if (res.ok) {
        setTransferStep("success")
        transferTimerRef.current = setTimeout(
          () => router.push("/dashboard/sites"),
          3000
        )
      } else {
        const data = (await res.json()) as { error?: string }
        toast.error(data.error ?? "Transfer failed")
        setTransferStep("looked-up")
      }
    } catch {
      toast.error("Network error. Transfer failed.")
      setTransferStep("looked-up")
    }
  }

  async function handleSaveEmail() {
    setSavingEmail(true)
    try {
      const res = await fetch(`/api/v1/sites/${site.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailNotificationsEnabled: emailEnabled,
          likeNotificationLimit: Math.max(
            0,
            Math.min(100, parseInt(likeNotificationLimit, 10) || 0)
          ),
          emailSubjectPrefix: emailSubjectPrefix || null,
          emailLogoUrl: emailLogoUrl || null,
          emailAccentColor: emailAccentColor || null,
          emailFooterText: emailFooterText || null,
          smtpHost: smtpHost || null,
          smtpPort: smtpPort ? parseInt(smtpPort, 10) : null,
          smtpUser: smtpUser || null,
          smtpPass: smtpPass || null,
          smtpFrom: smtpFrom || null,
        }),
      })
      if (!res.ok) throw new Error("Failed to save")
      toast.success("Email settings saved")
    } catch {
      toast.error("Failed to save email settings")
    } finally {
      setSavingEmail(false)
    }
  }

  async function handlePreview(type: "new-comment" | "reply") {
    setPreviewType(type)
    setPreviewLoading(true)
    setPreviewOpen(true)
    try {
      const res = await fetch(
        `/api/v1/sites/${site.id}/email-preview?type=${type}`
      )
      if (!res.ok) throw new Error("Preview failed")
      setPreviewHtml(await res.text())
    } catch {
      toast.error("Failed to load preview")
      setPreviewOpen(false)
    } finally {
      setPreviewLoading(false)
    }
  }

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
                value={originsText}
                onChange={(e) => setOriginsText(e.target.value)}
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
                className="size-4 rounded-sm border-input"
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
          <CardTitle className="text-base">Install snippet</CardTitle>
          <CardDescription>
            Paste this into any page where you want comments to appear.{" "}
            <code className="text-xs">data-slug</code> is optional — if omitted,
            the widget uses the current page path automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InstallSnippet
            code={`<div\n  data-open-remark\n  data-site-key="${site.siteKey}"\n></div>\n<script async src="${process.env.NEXT_PUBLIC_APP_URL}/embed.js"></script>`}
            language="html"
          />
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transfer Ownership</CardTitle>
          <CardDescription>
            Transfer this site to another registered user. You will lose access
            immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {transferStep === "success" ? (
            <p className="text-sm text-green-600">
              Site transferred to{" "}
              {transferRecipient?.name ?? transferRecipient?.email}.
              Redirecting…
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="transferEmail">New owner email</Label>
                <Input
                  id="transferEmail"
                  type="email"
                  value={transferEmail}
                  onChange={(e) => {
                    setTransferEmail(e.target.value)
                    if (transferStep !== "idle") {
                      setTransferStep("idle")
                      setTransferRecipient(null)
                      setTransferError("")
                    }
                  }}
                  disabled={
                    transferStep === "looking" ||
                    transferStep === "transferring"
                  }
                  placeholder="user@example.com"
                />
                {transferError && (
                  <p className="text-xs text-destructive">{transferError}</p>
                )}
              </div>

              {(transferStep === "idle" ||
                transferStep === "looking" ||
                transferStep === "error") && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLookup}
                  disabled={!transferEmail || transferStep === "looking"}
                >
                  {transferStep === "looking" ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Looking up…
                    </>
                  ) : (
                    "Look up user"
                  )}
                </Button>
              )}

              {(transferStep === "looked-up" ||
                transferStep === "transferring") &&
                transferRecipient && (
                  <div className="flex flex-col gap-3">
                    <div className="rounded-md border px-3 py-2 text-sm">
                      <span className="font-medium">
                        {transferRecipient.name ?? "Unknown"}
                      </span>
                      <span className="ml-2 text-muted-foreground">
                        {transferRecipient.email}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={handleTransfer}
                        disabled={transferStep === "transferring"}
                      >
                        {transferStep === "transferring" ? (
                          <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Transferring…
                          </>
                        ) : (
                          "Confirm Transfer"
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={transferStep === "transferring"}
                        onClick={() => {
                          setTransferStep("idle")
                          setTransferRecipient(null)
                          setTransferEmail("")
                          setTransferError("")
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>
            Notify site owners on new comments and commenters on replies.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Enable notifications</p>
              <p className="text-xs text-muted-foreground">
                {smtpConfigured
                  ? "Send email alerts for this site"
                  : "Configure SMTP relay below before enabling"}
              </p>
            </div>
            <Switch
              checked={emailEnabled}
              onCheckedChange={setEmailEnabled}
              disabled={!smtpConfigured}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Like notification limit</p>
              <p className="text-xs text-muted-foreground">
                Notify commenters on likes up to this count. Set to 0 to
                disable.
              </p>
            </div>
            <Input
              type="number"
              min={0}
              max={100}
              className="w-20 text-right"
              value={likeNotificationLimit}
              onChange={(e) => setLikeNotificationLimit(e.target.value)}
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email-subject-prefix">Subject prefix</Label>
              <Input
                id="email-subject-prefix"
                placeholder="[New Comment]"
                value={emailSubjectPrefix}
                onChange={(e) => setEmailSubjectPrefix(e.target.value)}
                maxLength={50}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email-logo-url">Logo URL</Label>
              <Input
                id="email-logo-url"
                placeholder="https://yourdomain.com/logo.png"
                value={emailLogoUrl}
                onChange={(e) => setEmailLogoUrl(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email-accent-color">Accent color</Label>
              <Input
                id="email-accent-color"
                placeholder="#6366f1"
                value={emailAccentColor}
                onChange={(e) => setEmailAccentColor(e.target.value)}
                maxLength={7}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email-footer-text">Footer text</Label>
              <Textarea
                id="email-footer-text"
                placeholder="You're receiving this because you commented on this site."
                value={emailFooterText}
                onChange={(e) => setEmailFooterText(e.target.value)}
                rows={2}
                maxLength={300}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <p className="text-sm font-medium">SMTP Relay</p>
            <p className="-mt-2 text-xs text-muted-foreground">
              Configure per-site SMTP credentials. Supports any provider
              including Resend (smtp.resend.com:465).
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="smtp-host">Host</Label>
                <Input
                  id="smtp-host"
                  placeholder="smtp.resend.com"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="smtp-port">Port</Label>
                <Input
                  id="smtp-port"
                  type="number"
                  placeholder="465"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="smtp-user">Username</Label>
              <Input
                id="smtp-user"
                placeholder="resend"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                autoComplete="off"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="smtp-pass">Password / API Key</Label>
              <div className="relative">
                <Input
                  id="smtp-pass"
                  type={showSmtpPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  autoComplete="new-password"
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowSmtpPass((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground hover:text-foreground"
                  aria-label={showSmtpPass ? "Hide password" : "Show password"}
                >
                  {showSmtpPass ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="smtp-from">
                From address{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="smtp-from"
                type="email"
                placeholder="noreply@yourdomain.com"
                value={smtpFrom}
                onChange={(e) => setSmtpFrom(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The sender address shown to recipients. Leave blank to use the
                username above. Required for providers like Resend where the
                username isn&apos;t an email (e.g. &quot;resend&quot;).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button onClick={handleSaveEmail} disabled={savingEmail} size="sm">
              {savingEmail && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePreview("new-comment")}
            >
              Preview: New Comment
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePreview("reply")}
            >
              Preview: Reply
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {previewType === "new-comment"
                ? "New Comment Email"
                : "Reply Email"}{" "}
              Preview
            </DialogTitle>
          </DialogHeader>
          {previewLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <iframe
              srcDoc={previewHtml}
              className="h-[480px] w-full rounded border"
              title="Email preview"
              sandbox="allow-same-origin"
            />
          )}
        </DialogContent>
      </Dialog>

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
