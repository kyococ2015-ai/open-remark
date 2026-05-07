import Link from "next/link";
import { auth } from "@/lib/auth";
import { getOwnerOverview } from "@/lib/services/moderation-service";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import {
  RiMessage2Line,
  RiCheckboxCircleLine,
  RiTimeLine,
  RiAlertLine,
  RiGlobalLine,
  RiArrowRightLine,
} from "@remixicon/react";

export default async function OverviewPage() {
  const session = await auth();
  const overview = await getOwnerOverview(session!.user!.id as string);

  return (
    <div>
      <PageHeader title="Overview" description="Summary of all your sites and comments" />

      <div className="p-6 flex flex-col gap-6">
        {/* Stats grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            description={overview.pendingComments > 0 ? "Needs attention" : "All clear"}
          />
          <StatCard
            title="Approved"
            value={overview.approvedComments}
            icon={RiCheckboxCircleLine}
            variant="success"
          />
        </div>

        {/* Pending alert */}
        {overview.pendingComments > 0 && (
          <div className="rounded-lg border border-warning/20 bg-warning/10 p-4 flex items-center justify-between">
            <p className="text-sm text-warning">
              <strong>{overview.pendingComments}</strong> comment
              {overview.pendingComments !== 1 ? "s" : ""} waiting for review across your sites
            </p>
            <Button asChild size="sm" variant="outline" className="border-warning/30">
              <Link href="/dashboard/sites">Review now</Link>
            </Button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent sites */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Your Sites</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/sites" className="flex items-center gap-1">
                  View all <RiArrowRightLine className="size-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {overview.sites.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sites yet.</p>
              ) : (
                overview.sites.map((site) => (
                  <Link
                    key={site.id}
                    href={`/dashboard/sites/${site.id}`}
                    className="flex items-center gap-3 rounded-md p-2.5 transition-colors hover:bg-accent"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                      <RiGlobalLine className="size-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{site.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{site.domain}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                      <span>{site._count.pages} page{site._count.pages !== 1 ? "s" : ""}</span>
                      <span>{site.pages.reduce((acc, p) => acc + p._count.comments, 0)} comments</span>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent comments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Comments</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {overview.recentComments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No comments yet.</p>
              ) : (
                overview.recentComments.map((comment) => (
                  <Link
                    key={comment.id}
                    href={`/dashboard/sites/${comment.page.site.id}/comments?status=${comment.status}`}
                    className="flex items-center gap-3 rounded-md p-2.5 transition-colors hover:bg-accent"
                  >
                    <Avatar className="size-8 shrink-0">
                      <AvatarFallback className="text-xs">
                        {comment.authorName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{comment.authorName}</p>
                        <Badge
                          variant={
                            comment.status === "APPROVED"
                              ? "default"
                              : comment.status === "PENDING"
                                ? "secondary"
                                : comment.status === "SPAM"
                                  ? "destructive"
                                  : "outline"
                          }
                          className="text-xs h-4 px-1"
                        >
                          {comment.status.toLowerCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {comment.page.site.name} · {comment.page.slug}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    </span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
