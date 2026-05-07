import Link from "next/link";
import { auth } from "@/lib/auth";
import { getOwnerOverview } from "@/lib/services/moderation-service";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import {
  RiMessage2Line,
  RiCheckboxCircleLine,
  RiTimeLine,
  RiGlobalLine,
  RiArrowRightLine,
} from "@remixicon/react";

export default async function OverviewPage() {
  const session = await auth();
  const overview = await getOwnerOverview(session!.user!.id as string);

  return (
    <div>
      <PageHeader title="Overview" description="Summary of all your sites and comments" />

      <div className="p-8 flex flex-col gap-8">
        {/* Stats grid */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 border-b pb-8">
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
          <div className="border-l-2 border-warning px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-warning">
              <strong>{overview.pendingComments}</strong> comment
              {overview.pendingComments !== 1 ? "s" : ""} waiting for review across your sites
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/sites">Review now</Link>
            </Button>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Sites list */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Your Sites
              </h2>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/sites" className="flex items-center gap-1">
                  View all <RiArrowRightLine className="size-3.5" />
                </Link>
              </Button>
            </div>
            <Separator />
            <div className="flex flex-col">
              {overview.sites.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No sites yet.</p>
              ) : (
                overview.sites.map((site) => (
                  <Link
                    key={site.id}
                    href={`/dashboard/sites/${site.id}`}
                    className="flex items-center gap-4 py-4 border-b transition-all hover:border-l-2 hover:border-primary hover:pl-3"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center bg-muted text-sm font-medium">
                      {site.name.charAt(0).toUpperCase()}
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
            </div>
          </div>

          {/* Recent comments */}
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Recent Comments
            </h2>
            <Separator />
            <div className="flex flex-col">
              {overview.recentComments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No comments yet.</p>
              ) : (
                overview.recentComments.map((comment) => (
                  <Link
                    key={comment.id}
                    href={`/dashboard/sites/${comment.page.site.id}/comments?status=${comment.status}`}
                    className="flex items-center gap-4 py-4 border-b transition-all hover:border-l-2 hover:border-primary hover:pl-3"
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
                          className="text-xs h-4 px-1 rounded-none"
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
