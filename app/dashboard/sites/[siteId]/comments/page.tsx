import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { getSiteByIdForOwner } from "@/lib/services/site-service";
import { getCommentsBySite } from "@/lib/services/comment-service";
import { getPagesForSite } from "@/lib/services/page-service";
import { CommentsTable } from "@/components/dashboard/comments-table";
import { PagesFilterPanel } from "@/components/dashboard/pages-filter-panel";
import { CommentSearchInput } from "@/components/dashboard/comment-search-input";
import Link from "next/link";
import { CommentStatus } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ status?: string; slug?: string; page?: string; search?: string }>;
};

const STATUSES = ["ALL", "PENDING", "APPROVED", "SPAM", "DELETED"] as const;
const LIMIT = 20;

export default async function CommentsPage({ params, searchParams }: Props) {
  const { siteId } = await params;
  const { status, slug, page: pageParam, search } = await searchParams;

  const session = await auth();

  let site;
  try {
    site = await getSiteByIdForOwner(siteId, session!.user!.id as string);
  } catch {
    notFound();
  }

  const activeStatus =
    status && status !== "ALL" ? (status as CommentStatus) : undefined;
  const currentPage = Math.max(1, parseInt(pageParam ?? "1", 10));

  const [{ comments, total, limit }, pages] = await Promise.all([
    getCommentsBySite(siteId, {
      status: activeStatus,
      slug: slug || undefined,
      page: currentPage,
      limit: LIMIT,
      search: search || undefined,
    }),
    getPagesForSite(siteId),
  ]);

  const totalPages = Math.ceil(total / limit);

  function buildHref(overrides: { status?: string; slug?: string | null; page?: number; search?: string | null }) {
    const base = `/dashboard/sites/${siteId}/comments`;
    const params = new URLSearchParams();

    const s = overrides.status ?? (status && status !== "ALL" ? status : undefined);
    if (s && s !== "ALL") params.set("status", s);

    const sl = overrides.slug !== undefined ? overrides.slug : (slug ?? undefined);
    if (sl) params.set("slug", sl);

    const sr = overrides.search !== undefined ? overrides.search : (search ?? undefined);
    if (sr) params.set("search", sr);

    const p = overrides.page ?? currentPage;
    if (p > 1) params.set("page", String(p));

    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }

  function statusHref(s: string) {
    return buildHref({ status: s, page: 1 });
  }

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1)
  );

  const dedupedPageNumbers = pageNumbers.reduce<number[]>((acc, p, i) => {
    if (i > 0 && p - pageNumbers[i - 1] > 1) {
      acc.push(-1); // ellipsis marker
    }
    acc.push(p);
    return acc;
  }, []);

  return (
    <div className="flex h-full min-h-0">
      {/* Pages panel — only shown when there are pages */}
      {pages.length > 0 && (
        <PagesFilterPanel
          siteId={siteId}
          pages={pages.map((p) => ({ id: p.id, slug: p.slug, count: p._count.comments }))}
          activeSlug={slug}
          activeStatus={status}
          search={search}
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

          <div className="flex items-center gap-3 flex-wrap">
            <CommentSearchInput />

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
        </div>

        <div className="p-6">
          <CommentsTable
            comments={comments as Parameters<typeof CommentsTable>[0]["comments"]}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  disabled={currentPage <= 1}
                  asChild
                >
                  <Link href={buildHref({ page: currentPage - 1 })}>
                    <ChevronLeft className="size-4" />
                  </Link>
                </Button>

                {dedupedPageNumbers.map((p, i) =>
                  p === -1 ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-sm text-muted-foreground">
                      ...
                    </span>
                  ) : (
                    <Button
                      key={p}
                      variant={p === currentPage ? "default" : "outline"}
                      size="sm"
                      className="h-8 min-w-8 px-2.5"
                      asChild
                    >
                      <Link href={buildHref({ page: p })}>{p}</Link>
                    </Button>
                  )
                )}

                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  disabled={currentPage >= totalPages}
                  asChild
                >
                  <Link href={buildHref({ page: currentPage + 1 })}>
                    <ChevronRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
