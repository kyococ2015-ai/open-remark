import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getSiteByIdForOwner } from "@/lib/services/site-service";
import { getCommentsBySite } from "@/lib/services/comment-service";
import { PageHeader } from "@/components/dashboard/page-header";
import { CommentsTable } from "@/components/dashboard/comments-table";
import Link from "next/link";
import { CommentStatus } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";

type Props = {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ status?: string }>;
};

const STATUSES = ["ALL", "PENDING", "APPROVED", "SPAM", "DELETED"] as const;

export default async function CommentsPage({ params, searchParams }: Props) {
  const { siteId } = await params;
  const { status } = await searchParams;

  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  let site;
  try {
    site = await getSiteByIdForOwner(siteId, session.user.id);
  } catch {
    notFound();
  }

  const activeStatus =
    status && status !== "ALL"
      ? (status as CommentStatus)
      : undefined;

  const { comments, total } = await getCommentsBySite(siteId, {
    status: activeStatus,
    limit: 100,
  });

  return (
    <div>
      <PageHeader
        title="Comments"
        description={`${site.name} · ${total} comment${total !== 1 ? "s" : ""}`}
      />

      <div className="p-6 space-y-4">
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map((s) => (
            <Button
              key={s}
              asChild
              variant={
                (s === "ALL" && !status) || s === status
                  ? "default"
                  : "outline"
              }
              size="sm"
            >
              <Link
                href={
                  s === "ALL"
                    ? `/dashboard/sites/${siteId}/comments`
                    : `/dashboard/sites/${siteId}/comments?status=${s}`
                }
              >
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </Link>
            </Button>
          ))}
        </div>

        <CommentsTable comments={comments as Parameters<typeof CommentsTable>[0]["comments"]} />
      </div>
    </div>
  );
}
