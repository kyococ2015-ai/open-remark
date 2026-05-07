import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { getSiteByIdForOwner } from "@/lib/services/site-service";
import { getCommentsBySite } from "@/lib/services/comment-service";
import { getPagesForSite } from "@/lib/services/page-service";
import { CommentsTable } from "@/components/dashboard/comments-table";
import { PagesFilterPanel } from "@/components/dashboard/pages-filter-panel";
import Link from "next/link";
import { CommentStatus } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Props = {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ status?: string; slug?: string }>;
};

const STATUSES = ["ALL", "PENDING", "APPROVED", "SPAM", "DELETED"] as const;

export default async function CommentsPage({ params, searchParams }: Props) {
  const { siteId } = await params;
  const { status, slug } = await searchParams;

  const session = await auth();

  let site;
  try {
    site = await getSiteByIdForOwner(siteId, session!.user!.id as string);
  } catch {
    notFound();
  }

  const activeStatus =
    status && status !== "ALL" ? (status as CommentStatus) : undefined;

  const [{ comments, total }, pages] = await Promise.all([
    getCommentsBySite(siteId, { status: activeStatus, slug: slug || undefined, limit: 100 }),
    getPagesForSite(siteId),
  ]);

  function statusHref(s: string) {
    const base = `/dashboard/sites/${siteId}/comments`;
    const params = new URLSearchParams();
    if (s !== "ALL") params.set("status", s);
    if (slug) params.set("slug", slug);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Pages panel — only shown when there are pages */}
      {pages.length > 0 && (
        <PagesFilterPanel
          siteId={siteId}
          pages={pages.map((p) => ({ id: p.id, slug: p.slug, count: p._count.comments }))}
          activeSlug={slug}
          activeStatus={status}
        />
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0 overflow-auto">
        {/* Page toolbar */}
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-base font-semibold shrink-0">Comments</h1>
            {slug && (
              <Badge variant="secondary" className="max-w-52 truncate font-normal text-xs">
                {slug}
              </Badge>
            )}
            <span className="text-sm text-muted-foreground tabular-nums shrink-0">
              {total} {total === 1 ? "comment" : "comments"}
            </span>
          </div>

          {/* Status filters */}
          <div className="flex gap-1.5 flex-wrap">
            {STATUSES.map((s) => (
              <Button
                key={s}
                asChild
                variant={(s === "ALL" && !status) || s === status ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-xs"
              >
                <Link href={statusHref(s)}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </Link>
              </Button>
            ))}
          </div>
        </div>

        <div className="p-6">
          <CommentsTable
            comments={comments as Parameters<typeof CommentsTable>[0]["comments"]}
          />
        </div>
      </div>
    </div>
  );
}
