"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import type { SiteRole, GrantableSiteRole } from "@/lib/permissions"

type Member = {
  userId: string
  role: SiteRole
  name: string | null
  email: string | null
  image: string | null
}
type Invite = { id: string; email: string; role: SiteRole }

type Props = {
  siteId: string
  currentUserId: string
  myRole: SiteRole
  grantableRoles: GrantableSiteRole[]
  members: Member[]
  invites: Invite[]
}

const ROLE_LABEL: Record<SiteRole, string> = {
  SITE_OWNER: "Owner",
  SITE_ADMIN: "Admin",
  SITE_MODERATOR: "Moderator",
}

export function TeamManager({
  siteId,
  currentUserId,
  grantableRoles,
  members,
  invites,
}: Props) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<GrantableSiteRole>(
    grantableRoles[0] ?? "SITE_MODERATOR"
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send(method: string, path: string, body: unknown) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Request failed")
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Team</h1>
        <p className="text-sm text-muted-foreground">
          Manage who can moderate and administer this site.
        </p>
      </div>

      {/* Invite form */}
      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault()
          if (!email) return
          send("POST", `/api/v1/sites/${siteId}/invites`, { email, role }).then(
            () => setEmail("")
          )
        }}
      >
        <Input
          type="email"
          required
          placeholder="teammate@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1"
        />
        <Select
          value={role}
          onValueChange={(v) => setRole(v as GrantableSiteRole)}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {grantableRoles.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABEL[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" disabled={busy}>
          Invite
        </Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Members */}
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Members</h2>
        <ul className="divide-y rounded-md border">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center gap-3 p-3">
              <Avatar className="size-8">
                <AvatarImage src={m.image ?? ""} alt={m.name ?? ""} />
                <AvatarFallback>
                  {(m.name ?? m.email ?? "U").slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {m.name ?? m.email}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {m.email}
                </p>
              </div>
              <Badge variant="secondary">{ROLE_LABEL[m.role]}</Badge>
              {m.role !== "SITE_OWNER" && m.userId !== currentUserId && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    send("DELETE", `/api/v1/sites/${siteId}/members`, {
                      userId: m.userId,
                    })
                  }
                >
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Pending invites */}
      {invites.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Pending invites
          </h2>
          <ul className="divide-y rounded-md border">
            {invites.map((i) => (
              <li key={i.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{i.email}</p>
                </div>
                <Badge variant="outline">{ROLE_LABEL[i.role]}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    send("DELETE", `/api/v1/sites/${siteId}/invites`, {
                      inviteId: i.id,
                    })
                  }
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
