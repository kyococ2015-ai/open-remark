import { auth } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { getSiteByIdForOwner } from '@/lib/services/site-service';
import { getCommentersBySite } from '@/lib/services/user-service';
import { UsersTable } from '@/components/dashboard/users-table';
import { UserSearchInput } from '@/components/dashboard/user-search-input';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ page?: string; search?: string }>;
};

const LIMIT = 20;

export default async function UsersPage({ params, searchParams }: Props) {
  const { siteId } = await params;
  const { page: pageParam, search } = await searchParams;

  const session = await auth();

  let site;
  try {
    site = await getSiteByIdForOwner(siteId, session!.user!.id as string);
  } catch {
    notFound();
  }

  const currentPage = Math.max(1, parseInt(pageParam ?? '1', 10));

  const { commenters, total, page, limit } = await getCommentersBySite(siteId, {
    page: currentPage,
    limit: LIMIT,
    search: search || undefined,
  });

  const totalPages = Math.ceil(total / limit);

  function buildHref(overrides: { page?: number; search?: string | null }) {
    const base = `/dashboard/sites/${siteId}/users`;
    const params = new URLSearchParams();

    const sr = overrides.search !== undefined ? overrides.search : (search ?? undefined);
    if (sr) params.set('search', sr);

    const p = overrides.page ?? currentPage;
    if (p > 1) params.set('page', String(p));

    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1),
  );

  const dedupedPageNumbers = pageNumbers.reduce<number[]>((acc, p, i) => {
    if (i > 0 && p - pageNumbers[i - 1] > 1) {
      acc.push(-1);
    }
    acc.push(p);
    return acc;
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-background border-b px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-base font-semibold shrink-0">Users</h1>
          <span className="text-sm text-muted-foreground tabular-nums shrink-0">
            {total} {total === 1 ? 'user' : 'users'}
          </span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <UserSearchInput />
        </div>
      </div>

      <div className="p-6 overflow-auto flex-1">
        <UsersTable commenters={commenters} siteId={siteId} />

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
                    variant={p === currentPage ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 min-w-8 px-2.5"
                    asChild
                  >
                    <Link href={buildHref({ page: p })}>{p}</Link>
                  </Button>
                ),
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
  );
}
