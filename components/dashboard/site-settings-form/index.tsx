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

  return (
    <div className="flex max-w-2xl flex-col gap-6 p-6">
      <GeneralSection site={site} onSiteChange={setSite} />
      <InstallSnippetSection siteKey={site.siteKey} />
      <AppearanceSection site={site} onSiteChange={setSite} />
      {siteCan(role, "TRANSFER_SITE") && <TransferSection siteId={site.id} />}
      <div className="relative">
        {!siteCan(role, "TRANSFER_SITE") && (
          <div className="absolute inset-0 z-10 flex items-start justify-end rounded-lg p-2">
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Restricted: Owner only
            </span>
          </div>
        )}
        <div
          className={
            !siteCan(role, "TRANSFER_SITE")
              ? "pointer-events-none opacity-40"
              : undefined
          }
        >
          <EmailNotificationsSection site={site} />
        </div>
      </div>
      {siteCan(role, "DELETE_SITE") && (
        <>
          <Separator />
          <DangerZoneSection siteId={site.id} />
        </>
      )}
    </div>
  )
}
