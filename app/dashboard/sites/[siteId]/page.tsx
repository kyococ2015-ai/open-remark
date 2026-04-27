import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getSiteByIdForOwner } from "@/lib/services/site-service";
import { getSiteCommentStats } from "@/lib/services/moderation-service";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  CheckCircle,
  Clock,
  AlertTriangle,
  Settings,
  Code,
} from "lucide-react";

type Props = { params: Promise<{ siteId: string }> };

export default async function SiteOverviewPage({ params }: Props) {
  const { siteId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  let site;
  try {
    site = await getSiteByIdForOwner(siteId, session.user.id);
  } catch {
    notFound();
  }

  const stats = await getSiteCommentStats(siteId);

  return (
    <div>
      <PageHeader
        title={site.name}
        description={site.domain}
        action={
          <div className="flex gap-2">
            <Button asChild size="sm">
              <Link href={`/dashboard/sites/${siteId}/install`}>
                <Code className="mr-1 h-3.5 w-3.5" />
                Integration
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/sites/${siteId}/settings`}>
                <Settings className="mr-1 h-3.5 w-3.5" />
                Settings
              </Link>
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Comments"
            value={stats.total}
            icon={MessageSquare}
          />
          <StatCard
            title="Pending Review"
            value={stats.pending}
            icon={Clock}
            variant="warning"
            description={stats.pending > 0 ? "Needs attention" : "All clear"}
          />
          <StatCard
            title="Approved"
            value={stats.approved}
            icon={CheckCircle}
            variant="success"
          />
          <StatCard
            title="Spam"
            value={stats.spam}
            icon={AlertTriangle}
            variant="destructive"
          />
        </div>

        {stats.pending > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4 flex items-center justify-between">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>{stats.pending}</strong> comment
              {stats.pending !== 1 ? "s" : ""} waiting for review
            </p>
            <Button asChild size="sm" variant="outline" className="border-amber-300">
              <Link href={`/dashboard/sites/${siteId}/comments?status=PENDING`}>
                Review now
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
