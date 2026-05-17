import { notFound } from "next/navigation"
import { getSiteByIdForOwner } from "@/lib/services/site-service"
import { SiteSettingsForm } from "@/components/dashboard/site-settings-form"
import { auth } from "@/lib/auth"

type Props = { params: Promise<{ siteId: string }> }

export default async function SiteSettingsPage({ params }: Props) {
  const { siteId } = await params

  const session = await auth()

  let site
  try {
    site = await getSiteByIdForOwner(siteId, session!.user!.id as string)
  } catch {
    notFound()
  }

  return (
    <SiteSettingsForm
      site={{ ...site, theme: site.theme as "AUTO" | "LIGHT" | "DARK" }}
    />
  )
}
