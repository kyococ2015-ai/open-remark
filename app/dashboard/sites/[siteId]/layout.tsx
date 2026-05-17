import { auth } from "@/lib/auth"
import { notFound } from "next/navigation"
import { getSiteByIdForOwner } from "@/lib/services/site-service"
import { SiteSubNav } from "@/components/dashboard/site-sub-nav"

type Props = {
  children: React.ReactNode
  params: Promise<{ siteId: string }>
}

export default async function SiteLayout({ children, params }: Props) {
  const { siteId } = await params

  const session = await auth()

  let site
  try {
    site = await getSiteByIdForOwner(siteId, session!.user!.id as string)
  } catch {
    notFound()
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SiteSubNav
        siteId={siteId}
        siteName={site.name}
        siteDomain={site.domain}
      />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  )
}
