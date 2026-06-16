import { notFound } from "next/navigation"
import { requireSiteAccess } from "@/lib/services/membership-service"
import { SiteSettingsForm } from "@/components/dashboard/site-settings-form"
import { auth } from "@/lib/auth"

type Props = { params: Promise<{ siteId: string }> }

export default async function SiteSettingsPage({ params }: Props) {
  const { siteId } = await params

  const session = await auth()

  let site
  try {
    const res = await requireSiteAccess(siteId, session!.user!.id, "MANAGE_SETTINGS")
    site = res.site
  } catch {
    notFound()
  }

  return (
    <SiteSettingsForm
      site={{
        ...site,
        theme: site.theme as "AUTO" | "LIGHT" | "DARK",
        siteKey: site.siteKey,
      }}
    />
  )
}
