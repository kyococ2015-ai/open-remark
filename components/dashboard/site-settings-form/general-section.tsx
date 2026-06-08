"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Site } from "./types"
import { parseOrigins } from "./utils"

type Props = {
  site: Site
  onSiteChange: (site: Site) => void
}

export function GeneralSection({ site, onSiteChange }: Props) {
  const [loading, setLoading] = useState(false)
  const [originsText, setOriginsText] = useState(() =>
    parseOrigins(site.allowedOrigins).join("\n")
  )

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

    const res = await fetch(`/api/v1/sites/${site.id}`, {
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
      onSiteChange(updated)
      setOriginsText(parseOrigins(updated.allowedOrigins).join("\n"))
    } else {
      toast.error("Failed to save")
    }
    setLoading(false)
  }

  return (
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
              Only these origins can post comments via the embed. Use * to allow
              all (not recommended).
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
  )
}
