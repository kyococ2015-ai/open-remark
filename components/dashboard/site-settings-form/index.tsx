"use client"

import { useState } from "react"
import { Separator } from "@/components/ui/separator"
import { GeneralSection } from "./general-section"
import { InstallSnippetSection } from "./install-snippet-section"
import { AppearanceSection } from "./appearance-section"
import { TransferSection } from "./transfer-section"
import { EmailNotificationsSection } from "./email-notifications-section"
import { DangerZoneSection } from "./danger-zone-section"
import type { Site } from "./types"

type Props = {
  site: Site
}

export function SiteSettingsForm({ site: initialSite }: Props) {
  const [site, setSite] = useState<Site>(initialSite)

  return (
    <div className="flex max-w-2xl flex-col gap-6 p-6">
      <GeneralSection site={site} onSiteChange={setSite} />
      <InstallSnippetSection siteKey={site.siteKey} />
      <AppearanceSection site={site} onSiteChange={setSite} />
      <TransferSection siteId={site.id} />
      <EmailNotificationsSection site={site} />
      <Separator />
      <DangerZoneSection siteId={site.id} />
    </div>
  )
}
