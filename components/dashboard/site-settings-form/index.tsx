"use client"

import { useState } from "react"
import { Separator } from "@/components/ui/separator"
import { GeneralSection } from "./general-section"
import { InstallSnippetSection } from "./install-snippet-section"
import { AppearanceSection } from "./appearance-section"
import { TransferSection } from "./transfer-section"
import { EmailNotificationsSection } from "./email-notifications-section"
import { DangerZoneSection } from "./danger-zone-section"
import { siteCan, SETTINGS_SECTION_CAPABILITY } from "@/lib/permissions"
import type { SiteRole, SettingsSection } from "@/lib/permissions"
import type { Site } from "./types"

type Props = {
  site: Site
  role: SiteRole
}

export function SiteSettingsForm({ site: initialSite, role }: Props) {
  const [site, setSite] = useState<Site>(initialSite)
  const can = (section: SettingsSection) =>
    siteCan(role, SETTINGS_SECTION_CAPABILITY[section])

  return (
    <div className="flex max-w-2xl flex-col gap-6 p-6">
      {can("general") && <GeneralSection site={site} onSiteChange={setSite} />}
      {can("install") && <InstallSnippetSection siteKey={site.siteKey} />}
      {can("appearance") && (
        <AppearanceSection site={site} onSiteChange={setSite} />
      )}
      {can("transfer") && <TransferSection siteId={site.id} />}
      {can("email") && <EmailNotificationsSection site={site} />}
      {can("danger") && (
        <>
          <Separator />
          <DangerZoneSection siteId={site.id} />
        </>
      )}
    </div>
  )
}
