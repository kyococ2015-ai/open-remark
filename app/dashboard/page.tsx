import Link from "next/link"
import { auth } from "@/lib/auth"
import { getOwnerOverview } from "@/lib/services/moderation-service"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatCard } from "@/components/dashboard/stat-card"
import { CommentActivityChart } from "@/components/dashboard/comment-activity-chart"
import { CommentStatusChart } from "@/components/dashboard/comment-status-chart"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { SiteLogo } from "@/components/ui/site-logo"
import { Separator } from "@/components/ui/separator"
import { formatDistanceToNow } from "date-fns"
import {
  RiMessage2Line,
  RiCheckboxCircleLine,
  RiTimeLine,
  RiGlobalLine,
  RiArrowRightLine,
} from "@remixicon/react"

export default async function OverviewPage() {
  const session = await auth()
  const overview = await getOwnerOverview(session!.user!.id as string)

  const approvalRate =
    overview.totalComments > 0
      ? Math.round((overview.approvedComments / overview.totalComments) * 100)
      : 0

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Summary of all your sites and comments"
      />

      <div className="flex flex-col gap-8 p-8">
        {/* Stat cards */}
        <div className="grid gap-8 border-b pb-8 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Sites"
            value={overview.totalSites}
            icon={RiGlobalLine}
          />
          <StatCard
            title="Total Comments"
            value={overview.totalComments}
            icon={RiMessage2Line}
          />
          <StatCard
            title="Pending Review"
            value={overview.pendingComments}
            icon={RiTimeLine}
            variant="warning"
            description={
              overview.pendingComments > 0 ? "Needs attention" : "All clear"
            }
          />
          <StatCard
            title="Approved"
            value={overview.approvedComments}
            icon={RiCheckboxCircleLine}
            variant="success"
            description={
              overview.totalComments > 0
                ? `${approvalRate}% approval rate`
                : undefined
            }
          />
        </div>

        {/* Pending alert */}
        {overview.pendingComments > 0 && (
          <div className="border-warning flex items-center justify-between border-l-2 px-4 py-3">
            <p className="text-warning text-sm">
              <strong>{overview.pendingComments}</strong> comment
              {overview.pendingComments !== 1 ? "s" : ""} waiting for review
              across your sites
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/sites">Review now</Link>
            </Button>
          </div>
        )}

        {/* Charts row */}
        <div className="grid gap-8 border-b pb-8 lg:grid-cols-3">
          {/* Activity chart */}
          <div className="flex flex-col gap-3 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                Comment Activity
              </h2>
              <span className="text-xs text-muted-foreground">
                Last 30 days
              </span>
            </div>
            <Separator />
            <CommentActivityChart data={overview.commentActivity} />
          </div>

          {/* Status breakdown */}
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
              Status Breakdown
            </h2>
            <Separator />
            <div className="flex flex-1 items-center py-2">
              {overview.totalComments === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No comments yet.
                </p>
              ) : (
                <CommentStatusChart
                  approved={overview.approvedComments}
                  pending={overview.pendingComments}
                  spam={overview.spamComments}
                />
              )}
            </div>
          </div>
        </div>

        {/* Sites list + Recent comments */}
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                Your Sites
              </h2>
              <Button asChild variant="ghost" size="sm">
                <Link
                  href="/dashboard/sites"
                  className="flex items-center gap-1"
                >
                  View all <RiArrowRightLine className="size-3.5" />
                </Link>
              </Button>
            </div>
            <Separator />
            <div className="flex flex-col">
              {overview.sites.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                  No sites yet.
                </p>
              ) : (
                overview.sites.map((site) => (
                  <Link
                    key={site.id}
                    href={`/dashboard/sites/${site.id}`}
                    className="flex items-center gap-4 border-l-2 border-transparent py-4 transition-all hover:border-primary hover:bg-primary/5 hover:pl-3"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                      <SiteLogo
                        domain={site.domain}
                        size={22}
                        className="rounded-sm"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {site.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {site.domain}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        {site._count.pages} page
                        {site._count.pages !== 1 ? "s" : ""}
                      </span>
                      <span>
                        {site.pages.reduce(
                          (acc, p) => acc + p._count.comments,
                          0
                        )}{" "}
                        comments
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
              Recent Comments
            </h2>
            <Separator />
            <div className="flex flex-col">
              {overview.recentComments.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                  No comments yet.
                </p>
              ) : (
                overview.recentComments.map((comment) => (
                  <Link
                    key={comment.id}
                    href={`/dashboard/sites/${comment.page.site.id}/comments?status=${comment.status}`}
                    className="flex items-center gap-4 border-l-2 border-transparent py-4 transition-all hover:border-primary hover:bg-primary/5 hover:pl-3"
                  >
                    <Avatar className="size-8 shrink-0">
                      <AvatarFallback className="text-xs">
                        {comment.commenter.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">
                          {comment.commenter.name}
                        </p>
                        <Badge
                          variant={
                            comment.status === "APPROVED"
                              ? "default"
                              : comment.status === "PENDING"
                                ? "secondary"
                                : "outline"
                          }
                          className={
                            comment.status === "SPAM"
                              ? "h-4 rounded-none border-amber-200 bg-amber-50 px-1 text-xs text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400"
                              : comment.status === "DELETED"
                                ? "h-4 rounded-none border-border bg-muted px-1 text-xs text-muted-foreground"
                                : "h-4 rounded-none px-1 text-xs"
                          }
                        >
                          {comment.status.toLowerCase()}
                        </Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {comment.page.site.name} · {comment.page.slug}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs whitespace-nowrap text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
