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
      {isOwner && <TransferSection siteId={site.id} />}
      {isOwner && <EmailNotificationsSection site={site} />}
      {isOwner && (
        <>
          <Separator />
          <DangerZoneSection siteId={site.id} />
        </>
      )}
    </div>
  )
}
