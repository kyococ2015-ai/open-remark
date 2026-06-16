"use client"

import { useState } from "react"
import { Separator } from "@/components/ui/separator"
import { GeneralSection } from "./general-section"
import { InstallSnippetSection } from "./install-snippet-section"
import { AppearanceSection } from "./appearance-section"
import { TransferSection } from "./transfer-section"
import { EmailNotificationsSection } from "./email-notifications-section"
import { DangerZoneSection } from "./danger-zone-section"
import { siteCan } from "@/lib/permissions"
import type { SiteRole } from "@/lib/permissions"
import type { Site } from "./types"

function RestrictedSection({
  restricted,
  children,
}: {
  restricted: boolean
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      {restricted && (
        <div className="absolute inset-0 z-10 flex items-start justify-end rounded-lg p-2">
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            Restricted: Owner only
          </span>
        </div>
      )}
      <div
        className={restricted ? "pointer-events-none opacity-40" : undefined}
      >
        {children}
      </div>
    </div>
  )
}

type Props = {
  site: Site
  role: SiteRole
}

export function SiteSettingsForm({ site: initialSite, role }: Props) {
  const [site, setSite] = useState<Site>(initialSite)
  const isOwner = siteCan(role, "TRANSFER_SITE")

  return (
    <div className="flex max-w-2xl flex-col gap-6 p-6">
      <GeneralSection site={site} onSiteChange={setSite} />
      <InstallSnippetSection siteKey={site.siteKey} />
      <AppearanceSection site={site} onSiteChange={setSite} />
      <RestrictedSection restricted={!isOwner}>
        <TransferSection siteId={site.id} />
      </RestrictedSection>
      <RestrictedSection restricted={!isOwner}>
        <EmailNotificationsSection site={site} />
      </RestrictedSection>
      <Separator />
      <RestrictedSection restricted={!isOwner}>
        <DangerZoneSection siteId={site.id} />
      </RestrictedSection>
    </div>
  )
}
