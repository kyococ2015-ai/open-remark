import Link from "next/link"
import { auth } from "@/lib/auth"
import { notFound } from "next/navigation"
import { getSiteByIdForOwner } from "@/lib/services/site-service"
import { getSiteCommentStats } from "@/lib/services/moderation-service"
import { StatCard } from "@/components/dashboard/stat-card"
import { Button } from "@/components/ui/button"
import {
  RiMessage2Line,
  RiCheckboxCircleLine,
  RiTimeLine,
  RiAlertLine,
} from "@remixicon/react"

type Props = { params: Promise<{ siteId: string }> }

export default async function SiteOverviewPage({ params }: Props) {
  const { siteId } = await params
  const session = await auth()

  try {
    await getSiteByIdForOwner(siteId, session!.user!.id as string)
  } catch {
    notFound()
  }

  const stats = await getSiteCommentStats(siteId)

  return (
    <div>
      <div className="flex flex-col gap-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Comments"
            value={stats.total}
            icon={RiMessage2Line}
          />
          <StatCard
            title="Pending Review"
            value={stats.pending}
            icon={RiTimeLine}
            variant="warning"
            description={stats.pending > 0 ? "Needs attention" : "All clear"}
          />
          <StatCard
            title="Approved"
            value={stats.approved}
            icon={RiCheckboxCircleLine}
            variant="success"
          />
          <StatCard
            title="Spam"
            value={stats.spam}
            icon={RiAlertLine}
            variant="destructive"
          />
        </div>

        {stats.pending > 0 && (
          <div className="border-warning/20 bg-warning/10 flex items-center justify-between rounded-lg border p-4">
            <p className="text-warning text-sm">
              <strong>{stats.pending}</strong> comment
              {stats.pending !== 1 ? "s" : ""} waiting for review
            </p>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-warning/30"
            >
              <Link href={`/dashboard/sites/${siteId}/comments?status=PENDING`}>
                Review now
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
